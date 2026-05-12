-- ─────────────────────────────────────────────────────────────────────
-- 0012_sales_rep_commission.sql
--
-- Phase 21 — sales reps earn a configurable commission percent per
-- closed deal. Different reps get different rates; master sets each
-- rate from /master/sales-reps. The rep dashboard at /sales shows
-- COMMISSION ($ they earned) instead of raw revenue.
--
-- commission_pct is a percent (0–100), not a multiplier. Stored as
-- numeric(5,2) so we can hold values like 22.50 (22.5% commission).
-- ─────────────────────────────────────────────────────────────────────

alter table public.sales_reps
  add column if not exists commission_pct numeric(5,2) not null default 0
    check (commission_pct >= 0 and commission_pct <= 100);

comment on column public.sales_reps.commission_pct is
  'Percent of agreed_setup_cents the rep earns on each closed deal. Set by master per rep.';
