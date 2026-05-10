-- ─────────────────────────────────────────────────────────────────────
-- 0006_prospects_intake_v2.sql
--
-- Phase 7 of the build — beefs up `prospects` so the customer-facing
-- intake form can capture EVERY content field needed to auto-build
-- the site (instead of master entering it by hand later) and so
-- sales reps can be attributed + can encode a pre-agreed price into
-- the onboarding link.
--
-- New columns (all nullable so existing rows still validate):
--
--   intake_data            jsonb    — the full intake payload:
--                                     realtor info, brokerage, MLS,
--                                     licensed states, photos, voice
--                                     direction, etc.  Shape lives in
--                                     lib/intakeSchema.ts and is what
--                                     Phase 8 maps onto content_blocks.
--   sales_rep_ref          text     — slug of the rep who sent the
--                                     link (?ref=jenny). Lets us run
--                                     per-rep conversion reports.
--   agreed_setup_cents     integer  — price the rep promised the
--                                     customer ($600 minimum). When
--                                     set, the form auto-generates a
--                                     Stripe Payment Link on submit
--                                     for exactly this amount —
--                                     skipping the master "make a
--                                     quote" step entirely.
--   intake_submitted_at    timestamptz — when the long form was
--                                     completed (vs created_at which
--                                     is when the row was first
--                                     written, possibly mid-wizard).
-- ─────────────────────────────────────────────────────────────────────

alter table public.prospects
  add column if not exists intake_data jsonb;

alter table public.prospects
  add column if not exists sales_rep_ref text;

alter table public.prospects
  add column if not exists agreed_setup_cents integer
    check (agreed_setup_cents is null or agreed_setup_cents >= 0);

alter table public.prospects
  add column if not exists intake_submitted_at timestamptz;

-- Per-rep dashboard wants a fast scan-by-rep.
create index if not exists prospects_sales_rep_idx
  on public.prospects (sales_rep_ref, status, created_at desc);

comment on column public.prospects.intake_data is
  'Full intake form payload — realtor info, brokerage, MLS, photos, etc. Phase 8 maps this onto the new tenant''s content_blocks.';
comment on column public.prospects.sales_rep_ref is
  'Slug of the rep whose tracked link was used (e.g. "jenny"). Powers per-rep conversion reports in /master/leads.';
comment on column public.prospects.agreed_setup_cents is
  'Pre-agreed price the rep promised. When set, the form auto-creates a Stripe Payment Link on submit for this exact amount.';
