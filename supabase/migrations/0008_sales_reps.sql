-- ─────────────────────────────────────────────────────────────────────
-- 0008_sales_reps.sql
--
-- Phase 12 — sales rep accounts so reps can track their conversions.
--
-- Each rep gets a `slug` (URL-friendly id, e.g. "jenny") that becomes
-- their `?ref=jenny` parameter on the /get-started link they send to
-- prospects. The wizard already records this onto
-- `prospects.sales_rep_ref` (Phase 7), so no schema change there.
--
-- Why a separate table from auth.users? Reps may not need full
-- platform login — they're just identifiers for attribution. If a
-- rep DOES need access (to see their own dashboard), we'll add a
-- user_id linkback later and make a /rep/* gated section. For v1
-- this is read-only data the master sees.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.sales_reps (
  id           uuid primary key default gen_random_uuid(),
  -- Used as ?ref=<slug> on the onboarding link.
  slug         text not null unique
                 check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  full_name    text not null,
  email        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  notes        text
);
create index if not exists sales_reps_active_idx
  on public.sales_reps (is_active, slug);

alter table public.sales_reps enable row level security;

create policy "super admins read sales_reps"
  on public.sales_reps for select
  using (public.is_super_admin());

create policy "super admins manage sales_reps"
  on public.sales_reps for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

comment on table public.sales_reps is
  'Sales reps who send tracked onboarding links. Slug becomes ?ref=<slug> on /get-started.';
