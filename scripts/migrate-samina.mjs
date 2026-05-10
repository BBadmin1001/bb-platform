#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
// scripts/migrate-samina.mjs
//
// One-shot migration: copies every public.* row from the legacy
// samina-website Supabase project into the bb-platform Supabase
// project, stamping `tenant_id` so the data lands as the `samina`
// tenant. UUIDs are preserved across the move, so foreign keys inside
// the data (community.image_id → media.id, partner.category_id →
// partner_categories.id, etc.) keep pointing at the right rows
// without remapping.
//
// USAGE
//
//   1. Put the source (samina) Supabase URL + service role key in env
//      (these are different from the bb-platform project's keys —
//      grab them from samina-website/.env.local):
//
//        export SOURCE_SUPABASE_URL="https://<samina-ref>.supabase.co"
//        export SOURCE_SUPABASE_SERVICE_ROLE_KEY="eyJh…"
//
//   2. The bb-platform credentials come from the existing .env.local
//      automatically (NEXT_PUBLIC_SUPABASE_URL +
//      SUPABASE_SERVICE_ROLE_KEY).
//
//   3. Dry-run first to see what would be copied:
//
//        node --env-file=.env.local scripts/migrate-samina.mjs --dry-run
//
//   4. Real run:
//
//        node --env-file=.env.local scripts/migrate-samina.mjs
//
// SAFETY
//
//   • Idempotent — every insert is an upsert on the primary key,
//     so re-running just refreshes rows. No duplicates.
//   • The bb-platform tenant must already exist (slug = "samina").
//     The script bails early if it isn't found.
//   • Tables are migrated in FK dependency order. If anything fails
//     mid-way, you get a clear error and the previous tables stay
//     migrated — re-running is safe.
//   • The legacy `team_members` table is **not** copied. bb-platform's
//     `tenant_users` + `super_admins` cover admin assignment with the
//     trimmed (owner / editor) role enum.
//   • content_history is included so the 30-day rolling version log
//     survives the move.
// ─────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const TENANT_SLUG = process.env.TENANT_SLUG ?? "samina";
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");
// Default behaviour wipes existing tenant rows before inserting from
// the source. That's what we want for the initial samina seed: any
// content the bootstrap created on bb-platform gets replaced by the
// real samina data. Pass --no-wipe to keep existing rows (only safe
// when you're sure nothing collides on natural unique keys —
// `(tenant_id, slug)`, `(tenant_id, page, key)`, etc.).
const NO_WIPE = process.argv.includes("--no-wipe");

// ── Tables to migrate, in dependency order ──────────────────────────
//
// `select` is the columns to read from samina. `omit` drops columns
// that exist in samina but aren't valid on the bb-platform schema
// (rare — schema is mostly identical).
//
// `conflict` is the column(s) used for the upsert ON CONFLICT clause.
// Defaults to "id".
//
// `transform` is an optional row-level shaping function — used to drop
// values that bb-platform's stricter check constraints would reject
// (e.g. samina's reviews table allowed source='zillow' before the
// 'internal' source landed).
//
// `nullColumns` lists columns that reference auth.users(id) — those
// IDs are valid in samina's auth schema but not bb-platform's, so we
// blank them out. The columns are nullable on both sides (FK is
// `on delete set null`) so this is safe and just means we lose the
// "who edited what" provenance, which isn't worth a manual user
// remap.
//
// Order matters: media before everything that references media; forms
// before open_houses; partner_categories before partners; etc.
const TABLES = [
  { name: "media", nullColumns: ["uploaded_by"] },
  { name: "content_blocks", nullColumns: ["updated_by"] },
  { name: "content_history", nullColumns: ["saved_by"] },
  { name: "communities" },
  { name: "closings" },
  { name: "partner_categories" },
  { name: "partners" },
  { name: "forms" },
  { name: "open_houses" },
  {
    name: "county_landing_pages",
    // bb-platform dropped two columns samina had:
    //   • `services` — the concept got folded into service_areas
    //   • `updated_by` — auth-user audit column we don't track here
    // Strip both before insert.
    transform: (r) => {
      const {
        services: _services,
        updated_by: _updatedBy,
        ...rest
      } = r;
      return rest;
    },
  },
  { name: "reviews" },
  { name: "review_submissions", nullColumns: ["reviewed_by"] },
  { name: "leads" },
  // integrations uses (tenant_id, key) as PK — handle separately.
  {
    name: "integrations",
    conflict: "tenant_id,key",
    nullColumns: ["updated_by"],
  },
];

// ── Wire up clients ─────────────────────────────────────────────────
const sourceUrl = requireEnv("SOURCE_SUPABASE_URL");
const sourceKey = requireEnv("SOURCE_SUPABASE_SERVICE_ROLE_KEY");
const targetUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const targetKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

if (sourceUrl === targetUrl) {
  fatal(
    "SOURCE_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL point at the same project. " +
      "That would copy data on top of itself. Aborting.",
  );
}

const source = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const target = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Resolve the tenant id for the destination ───────────────────────
const { data: tenant, error: tenantErr } = await target
  .from("tenants")
  .select("id, slug, status")
  .eq("slug", TENANT_SLUG)
  .maybeSingle();

if (tenantErr) fatal(`Couldn't query bb-platform tenants: ${tenantErr.message}`);
if (!tenant) {
  fatal(
    `No tenant with slug='${TENANT_SLUG}' in bb-platform. ` +
      "Create it first via /master/tenants/new (or directly in Supabase) before migrating.",
  );
}

const tenantId = tenant.id;
log(
  `${DRY_RUN ? "[DRY-RUN] " : ""}Migrating samina → bb-platform tenant ` +
    `${TENANT_SLUG} (id=${tenantId}, status=${tenant.status})`,
);
log(`  source: ${sourceUrl}`);
log(`  target: ${targetUrl}`);
log("");

// ── Wipe pre-existing tenant rows ───────────────────────────────────
// Done in reverse dependency order so FK cascades don't fight us.
// Every table's tenant_id FK is `on delete cascade`, so wiping the
// parent would actually do this for us — but doing it explicitly per
// table makes the dry-run output honest and the failure modes
// localised.
if (!NO_WIPE) {
  for (const cfg of [...TABLES].reverse()) {
    if (DRY_RUN) {
      log(`[wipe ${cfg.name}] would delete tenant_id=${tenantId} rows`);
      continue;
    }
    const { error, count } = await target
      .from(cfg.name)
      .delete({ count: "exact" })
      .eq("tenant_id", tenantId);
    if (error) {
      fatal(`[wipe ${cfg.name}] delete failed: ${error.message}`);
    }
    if (VERBOSE || (count ?? 0) > 0) {
      log(`[wipe ${cfg.name}] deleted ${count ?? 0} rows`);
    }
  }
  log("");
}

// ── Run the migration table-by-table ────────────────────────────────
const summary = [];
for (const cfg of TABLES) {
  try {
    const stats = await migrateTable(cfg);
    summary.push({ table: cfg.name, ...stats });
  } catch (e) {
    console.error(`\n[${cfg.name}] FAILED — ${e.message}`);
    process.exitCode = 1;
    break;
  }
}

// ── Summary ─────────────────────────────────────────────────────────
log("");
log("─".repeat(60));
log("Summary");
log("─".repeat(60));
for (const row of summary) {
  log(
    `  ${row.table.padEnd(22)} read=${String(row.read).padStart(5)}  ` +
      `wrote=${String(row.wrote).padStart(5)}` +
      (row.skipped ? `  skipped=${row.skipped}` : ""),
  );
}
log("");
if (DRY_RUN) {
  log("Dry-run complete — no rows were written. Drop --dry-run to commit.");
} else {
  log("Migration complete. Next:");
  log("  1. Click 'Resync features' on /master/tenants/" + TENANT_SLUG);
  log("     so the tenants.features cache reflects active subscriptions.");
  log("  2. Open /admin from a samina-bound hostname and spot-check.");
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

async function migrateTable(cfg) {
  const { name, conflict = "id", transform, nullColumns = [] } = cfg;
  const t0 = Date.now();

  // 1. Read all rows from the source. Paginated — Supabase caps a
  // single SELECT at ~1000 rows, so loop with range() until we hit
  // the end.
  const rows = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await source
      .from(name)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`source SELECT failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (rows.length === 0) {
    log(`[${name}] empty source — nothing to copy.`);
    return { read: 0, wrote: 0 };
  }

  // 2. Stamp tenant_id, blank out auth-user FK columns, and apply
  // the optional row transform.
  const stamped = rows
    .map((r) => {
      const out = { ...r, tenant_id: tenantId };
      for (const col of nullColumns) {
        if (col in out) out[col] = null;
      }
      return out;
    })
    .map((r) => (transform ? transform(r) : r))
    .filter(Boolean);

  // 3. Write to target. Upsert with onConflict so we're idempotent.
  if (DRY_RUN) {
    log(`[${name}] would upsert ${stamped.length} rows (dry-run)`);
    if (VERBOSE && stamped[0]) {
      log(`  sample row keys: ${Object.keys(stamped[0]).join(", ")}`);
    }
    return { read: rows.length, wrote: 0 };
  }

  // Write in chunks so a single insert doesn't blow up on large tables.
  const CHUNK = 200;
  let wrote = 0;
  for (let i = 0; i < stamped.length; i += CHUNK) {
    const chunk = stamped.slice(i, i + CHUNK);
    const { error } = await target
      .from(name)
      .upsert(chunk, { onConflict: conflict });
    if (error) {
      throw new Error(
        `target UPSERT failed at offset ${i}: ${error.message} ` +
          `(hint: ${error.hint ?? "—"})`,
      );
    }
    wrote += chunk.length;
  }

  log(`[${name}] copied ${wrote}/${rows.length} rows in ${Date.now() - t0}ms`);
  return { read: rows.length, wrote };
}

function requireEnv(key) {
  const v = process.env[key]?.trim();
  if (!v) fatal(`Missing required env var: ${key}`);
  return v;
}

function log(msg) {
  console.log(msg);
}

function fatal(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}
