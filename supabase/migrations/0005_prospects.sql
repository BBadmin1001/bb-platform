-- ─────────────────────────────────────────────────────────────────────
-- 0005_prospects.sql
--
-- "Prospects" — realtors who've raised their hand for a website but
-- haven't been provisioned as tenants yet. Different from `leads`
-- (which is per-tenant inbound traffic on a customer's site). These
-- are platform-side opportunities you (master) work through:
--
--   new        →  intake form submitted, you haven't touched it yet
--   contacted  →  you've reached out, are talking
--   quoted     →  Stripe Payment Link generated + emailed
--   paid       →  Stripe webhook confirmed payment
--   provisioned →  tenant row created, customer has admin access
--   abandoned  →  closed without sale
--
-- A successful flow:  new → contacted → quoted → paid → provisioned
-- and the new tenant row links back via tenants.prospect_id so you
-- can audit who bought what.
-- ─────────────────────────────────────────────────────────────────────

create type public.prospect_status as enum (
  'new',
  'contacted',
  'quoted',
  'paid',
  'provisioned',
  'abandoned'
);

create table public.prospects (
  id                       uuid primary key default gen_random_uuid(),

  -- intake
  business_name            text not null,
  contact_name             text not null,
  email                    text not null,
  phone                    text,
  desired_domain           text,        -- what they want their website on
  state_abbr               text check (length(state_abbr) = 2),
  notes                    text,        -- free-form intake message
  source                   text,        -- e.g. 'website', 'referral:samina'

  -- quote (filled when master generates a Payment Link)
  quoted_setup_fee_cents   integer,     -- the variable setup fee
  quoted_plans             jsonb not null default '[]'::jsonb,
                                        -- e.g. ["marketing","visibility"]
  quote_notes              text,

  -- Stripe linkage
  stripe_payment_link_id   text,
  stripe_payment_link_url  text,
  stripe_session_id        text,        -- the checkout session id once they pay
  stripe_customer_id       text,
  paid_at                  timestamptz,

  -- lifecycle
  status                   public.prospect_status not null default 'new',

  -- After provisioning, this points at the tenant row that was
  -- created for them. Master detail page uses this to jump straight
  -- into the new tenant.
  tenant_id                uuid references public.tenants(id) on delete set null,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- The provisioning step needs the prospect's admin email to be a
  -- verified auth.users row first. We don't enforce that at the DB
  -- layer (auth happens on the Stripe webhook side) but log who did
  -- the provisioning.
  provisioned_by           uuid references auth.users(id) on delete set null,
  provisioned_at           timestamptz
);

create index prospects_status_idx       on public.prospects (status, created_at desc);
create index prospects_email_idx        on public.prospects (email);
create index prospects_session_idx      on public.prospects (stripe_session_id);

create trigger prospects_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();


-- Linkback on tenants so master can navigate prospect ⇄ tenant.
alter table public.tenants
  add column if not exists prospect_id uuid references public.prospects(id) on delete set null;


-- ── RLS ────────────────────────────────────────────────────────────────
-- Public can INSERT (the intake form is anon). Reads + updates are
-- super-admin only — no one outside the platform owners should see
-- anyone else's intake.

alter table public.prospects enable row level security;

create policy "anyone can submit intake"
  on public.prospects for insert
  to anon, authenticated
  with check (true);

create policy "super admins read prospects"
  on public.prospects for select
  using (public.is_super_admin());

create policy "super admins manage prospects"
  on public.prospects for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
