-- ─────────────────────────────────────────────────────────────────────
-- 0003_custom_domain_workflow.sql
--
-- Custom domain isn't optional — every realtor on the platform brings
-- their own domain, and we don't promote a tenant to `active` until
-- DNS is actually pointing at our hosting. This migration adds the
-- columns the master dashboard needs to track and verify that.
--
-- New columns on `tenants`:
--   • domain_target           text   — the CNAME value the customer
--                                       must point their domain at
--                                       (defaults from a platform-
--                                       wide setting; per-tenant
--                                       overridable when we eventually
--                                       split into multiple Netlify
--                                       sites)
--   • domain_check_state      enum   — 'unset' | 'pending' | 'verified' | 'mismatch'
--   • domain_check_value      text   — what we last observed (the
--                                       actual CNAME the customer's
--                                       domain currently resolves to)
--   • domain_checked_at       timestamptz — when we last asked DNS
--   • domain_verified_at      timestamptz — first time it pointed at us
--
-- The lifecycle:
--   1. Tenant created with domain → state='pending', check runs
--   2. DNS not pointing yet      → state stays 'pending', check_value
--                                  records what they actually have
--   3. DNS now points at us       → state='verified', verified_at set
--   4. Master flips status='active' → site goes live on the domain
--
-- 'mismatch' is reserved for the case where it pointed at us once but
-- the customer changed it back — gives master a chance to nudge them.
-- ─────────────────────────────────────────────────────────────────────

create type public.domain_check_state as enum (
  'unset',
  'pending',
  'verified',
  'mismatch'
);

alter table public.tenants
  add column if not exists domain_target       text,
  add column if not exists domain_check_state  public.domain_check_state not null default 'unset',
  add column if not exists domain_check_value  text,
  add column if not exists domain_checked_at   timestamptz,
  add column if not exists domain_verified_at  timestamptz;

-- Index so we can quickly find tenants whose verification is stale
-- (haven't been checked in N hours) — a future cron will scan this.
create index if not exists tenants_domain_check_idx
  on public.tenants (domain_check_state, domain_checked_at);

comment on column public.tenants.domain_target is
  'CNAME value the customer must point their domain at. Defaults to the platform DOMAIN_TARGET env var; per-tenant override when we run multiple Netlify sites.';

comment on column public.tenants.domain_check_state is
  'pending: domain set but DNS not pointing yet. verified: DNS confirms our CNAME. mismatch: was verified, now drifted.';
