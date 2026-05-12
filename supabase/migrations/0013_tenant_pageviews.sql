-- ─────────────────────────────────────────────────────────────────────
-- 0013_tenant_pageviews.sql
--
-- Phase 24 — built-in public-site analytics. Every realtor gets free
-- pageview tracking without setting up GA themselves. The advanced
-- Analytics feature (GA4 + Data API embeds) stays a paid upsell.
--
-- Privacy: we store NO IP addresses, NO cookies, NO PII. A coarse
-- `visitor_hash` (hash of UA + IP + day) gives us approximate unique-
-- visitor counts without ever persisting the raw values.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.tenant_pageviews (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  path         text not null,
  referrer     text,
  visitor_hash text,
  visited_at   timestamptz not null default now()
);

create index if not exists tenant_pageviews_tenant_idx
  on public.tenant_pageviews (tenant_id, visited_at desc);
create index if not exists tenant_pageviews_path_idx
  on public.tenant_pageviews (tenant_id, path);

alter table public.tenant_pageviews enable row level security;

-- Anon can INSERT views for any active tenant (the public beacon).
create policy "anon insert pageviews"
  on public.tenant_pageviews for insert
  with check (
    exists (
      select 1 from public.tenants t
      where t.id = tenant_pageviews.tenant_id and t.status = 'active'
    )
  );

-- Tenant members read their own.
create policy "tenant read own pageviews"
  on public.tenant_pageviews for select
  using (public.has_tenant_access(tenant_id));

comment on table public.tenant_pageviews is
  'Privacy-respecting pageview log for built-in analytics. No IPs / no cookies.';
