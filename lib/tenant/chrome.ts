import "server-only";

/**
 * Tenant chrome resolver — single source of truth for per-tenant
 * "identity" fields used by the public site's header, footer, contact
 * page, privacy page, and any other place that previously imported the
 * hardcoded `site` object from `lib/site.ts`.
 *
 * What lives here:
 *   • name           realtor display name (from tenants.realtor_name)
 *   • role           "Realtor" caption (from content_blocks brand.identity.role)
 *   • brokerage      from tenants.brokerage
 *   • phone/email    from content_blocks brand.contact, falling back to
 *                    tenants.contact_phone / contact_email
 *   • social         instagram/facebook/tiktok/linkedin URLs from
 *                    content_blocks brand.contact (all optional)
 *   • licenses       array of {state, number} pulled from content_blocks
 *                    brand.contact.licenses, fallback to tenants.license_va
 *                    + tenants.license_md
 *   • brokerageOffice  {name, street, cityStateZip, phone, phoneHref,
 *                       logoUrl} from content_blocks brand.contact.office
 *
 * Falls back to a neutral "Realtor" wordmark when no tenant is in
 * context (e.g. master URL, unknown host). NEVER returns Samina's
 * hardcoded contact data as a default — that was the bug.
 */

import { getCurrentTenant } from "./context";
import { getServiceClient } from "@/lib/contentLoader";

export type TenantSocial = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
};

export type TenantLicense = {
  state: string; // e.g. "VA"
  number: string;
};

export type TenantBrokerageOffice = {
  name: string;
  street: string;
  cityStateZip: string;
  phone: string;
  phoneHref: string;
};

export type TenantChrome = {
  /** True when a real tenant was resolved; false on master / unknown. */
  hasTenant: boolean;
  name: string; // never empty — defaults to "Realtor"
  role: string; // "Realtor" or whatever brand.identity.role is
  brokerage: string; // "" when unset
  phone: string; // "" when unset
  phoneHref: string; // "" when phone is empty
  email: string;
  emailHref: string;
  social: TenantSocial;
  licenses: TenantLicense[];
  brokerageOffice: TenantBrokerageOffice | null;
};

const EMPTY_CHROME: TenantChrome = {
  hasTenant: false,
  name: "Realtor",
  role: "Realtor",
  brokerage: "",
  phone: "",
  phoneHref: "",
  email: "",
  emailHref: "",
  social: {},
  licenses: [],
  brokerageOffice: null,
};

/** Build a tel: href from a phone string, or "" if empty. */
function telHref(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9+]/g, "");
  if (!digits) return "";
  return `tel:${digits.startsWith("+") ? digits : `+1${digits}`}`;
}

/** Build a mailto: href, or "" if empty. */
function mailHref(email: string | null | undefined): string {
  if (!email) return "";
  return `mailto:${email}`;
}

type ContactBlock = {
  phone?: string;
  email?: string;
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
  licenses?: Array<{ state?: string; number?: string }>;
  office?: {
    name?: string;
    street?: string;
    cityStateZip?: string;
    phone?: string;
  };
};

type IdentityBlock = {
  role?: string;
};

/**
 * Resolve the chrome data for the active tenant. Returns
 * `{ hasTenant: false }` (with safe neutral defaults) when no tenant is
 * in context. NEVER throws.
 */
export async function getTenantChrome(): Promise<TenantChrome> {
  const tenant = await getCurrentTenant();
  if (!tenant) return EMPTY_CHROME;

  const supabase = getServiceClient();
  let contactBlock: ContactBlock = {};
  let identityBlock: IdentityBlock = {};

  if (supabase) {
    // One DB roundtrip with an OR filter — pull both brand.contact and
    // brand.identity in a single query. The tenant id check is the index
    // hit; the OR-on-key is two indexed string compares.
    const { data: rows } = await supabase
      .from("content_blocks")
      .select("key, value")
      .eq("tenant_id", tenant.id)
      .eq("page", "brand")
      .in("key", ["contact", "identity"]);
    for (const row of rows ?? []) {
      if (!row.value) continue;
      try {
        const parsed = JSON.parse(row.value);
        if (row.key === "contact") contactBlock = parsed ?? {};
        else if (row.key === "identity") identityBlock = parsed ?? {};
      } catch {
        // ignore malformed JSON; fall through to fallback values
      }
    }
  }

  // Phone + email: prefer content_blocks brand.contact, then tenants row.
  // tenants table doesn't currently have phone (column may be null), so
  // fall through to "" rather than spotting Samina's hardcoded constants.
  type TenantWithContact = typeof tenant & {
    contact_phone?: string | null;
    contact_email?: string | null;
  };
  const tWithContact = tenant as TenantWithContact;
  const phone = (contactBlock.phone || tWithContact.contact_phone || "").trim();
  const email = (contactBlock.email || tWithContact.contact_email || "").trim();

  // Licenses — content_blocks list wins; otherwise legacy single VA/MD columns.
  type TenantWithLicenses = typeof tenant & {
    license_va?: string | null;
    license_md?: string | null;
  };
  const tWithLic = tenant as TenantWithLicenses;
  let licenses: TenantLicense[] = [];
  if (Array.isArray(contactBlock.licenses) && contactBlock.licenses.length > 0) {
    licenses = contactBlock.licenses
      .filter((l) => l && (l.state || l.number))
      .map((l) => ({
        state: (l.state ?? "").trim(),
        number: (l.number ?? "").trim(),
      }))
      .filter((l) => l.number);
  } else {
    if (tWithLic.license_va) {
      licenses.push({ state: "VA", number: tWithLic.license_va });
    }
    if (tWithLic.license_md) {
      licenses.push({ state: "MD", number: tWithLic.license_md });
    }
  }

  // Brokerage office is purely from content_blocks — there are no
  // dedicated tenants.* columns, by design (it's optional, free-form).
  let brokerageOffice: TenantBrokerageOffice | null = null;
  const off = contactBlock.office;
  if (off && (off.name || off.street || off.cityStateZip || off.phone)) {
    const oPhone = (off.phone ?? "").trim();
    brokerageOffice = {
      name: (off.name ?? tenant.brokerage ?? "").trim(),
      street: (off.street ?? "").trim(),
      cityStateZip: (off.cityStateZip ?? "").trim(),
      phone: oPhone,
      phoneHref: telHref(oPhone),
    };
  }

  return {
    hasTenant: true,
    name: tenant.realtor_name?.trim() || "Realtor",
    role: (identityBlock.role ?? "").trim() || "Realtor",
    brokerage: tenant.brokerage?.trim() || "",
    phone,
    phoneHref: telHref(phone),
    email,
    emailHref: mailHref(email),
    social: {
      instagram: contactBlock.social?.instagram?.trim() || undefined,
      facebook: contactBlock.social?.facebook?.trim() || undefined,
      tiktok: contactBlock.social?.tiktok?.trim() || undefined,
      linkedin: contactBlock.social?.linkedin?.trim() || undefined,
    },
    licenses,
    brokerageOffice,
  };
}
