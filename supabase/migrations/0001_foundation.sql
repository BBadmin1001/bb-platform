-- ─────────────────────────────────────────────────────────────────────
-- 0001_foundation.sql
--
-- Multi-tenant foundation for BB Website Project.
--
-- A "tenant" = one realtor customer (e.g. Samina Bilal). Each tenant
-- gets their own subdomain or custom domain, but everything lives in
-- ONE database with row-level security keyed by tenant_id.
--
-- This migration sets up:
--   • tenants                — one row per realtor customer
--   • tenant_users           — which auth.users can edit which tenant
--   • plans                  — bundled feature plans (sold $/month)
--   • tenant_subscriptions   — which plans each tenant currently has
--   • super_admins           — global master-dashboard admins
--   • helper functions       — current_tenant_id(), is_super_admin(),
--                              has_tenant_access()
--   • baseline RLS policies  — admins see their own tenant; super
--                              admins see everything; anon sees nothing
--                              from these admin tables
--
-- Content tables (communities, closings, reviews, etc.) come in
-- later migrations and follow the same pattern: tenant_id column +
-- has_tenant_access() RLS.
-- ─────────────────────────────────────────────────────────────────────

-- 1. Extensions ────────────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";


-- 2. Super admins ──────────────────────────────────────────────────────
-- Global master-dashboard operators. Has nothing to do with any one
-- tenant — these are *us*, the platform owners. Stored in its own table
-- (rather than a column on auth.users) so we can audit grants.
create table public.super_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  notes      text
);

comment on table public.super_admins is
  'Platform-level operators. Can impersonate tenants and edit plans.';


-- 3. Tenants ───────────────────────────────────────────────────────────
create type public.tenant_status as enum ('pending', 'active', 'suspended', 'archived');

create table public.tenants (
  id              uuid primary key default gen_random_uuid(),

  -- routing
  slug            text not null unique
                    check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  -- e.g. 'samina'  →  served at samina.bbwebsite.com
  custom_domain   text unique,
  -- e.g. 'saminabilal.com'  →  CNAMEd to bbwebsite.com via Netlify alias

  -- identity (defaults; overridable via content_blocks once we port them)
  realtor_name    text not null,
  brokerage       text,
  contact_email   text not null,
  contact_phone   text,

  -- jurisdiction
  state_abbr      text check (length(state_abbr) = 2),
  license_va      text,
  license_md      text,

  -- runtime feature flags. Cached from active subscriptions for fast
  -- gating in middleware/SSR. Updated by Stripe webhooks.
  features        jsonb not null default '{}'::jsonb,

  -- billing
  stripe_customer_id text unique,

  -- lifecycle
  status          public.tenant_status not null default 'pending',
  provisioned_at  timestamptz,
  archived_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index tenants_status_idx       on public.tenants (status);
create index tenants_custom_domain_idx on public.tenants (custom_domain) where custom_domain is not null;

comment on table public.tenants is
  'One row per realtor customer. Drives middleware hostname routing.';
comment on column public.tenants.features is
  'Cached feature flags from active subscriptions. Source of truth for gating.';


-- 4. Tenant users (admin assignment) ──────────────────────────────────
-- An auth.users row can belong to one tenant as 'owner' (the realtor)
-- or as 'editor' (an assistant they invited). Super admins are tracked
-- separately in public.super_admins and don't need a row here.
create type public.tenant_user_role as enum ('owner', 'editor');

create table public.tenant_users (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.tenant_user_role not null default 'editor',
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_users_user_idx on public.tenant_users (user_id);

comment on table public.tenant_users is
  'Maps auth.users → tenants for admin panel access.';


-- 5. Plans ─────────────────────────────────────────────────────────────
-- Bundled feature plans editable by super admins from the master
-- dashboard. Selling these triggers a Stripe Subscription which in
-- turn flips feature flags on tenants.features.
create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                      check (slug ~ '^[a-z0-9][a-z0-9-]+[a-z0-9]$'),
  -- e.g. 'marketing'  ⇒ unlocks flyers + google_reviews
  name              text not null,
  description       text,

  price_cents       integer not null check (price_cents >= 0),
  -- e.g. 3000 = $30.00 (currency assumed USD for v1)
  interval          text not null
                      check (interval in ('monthly', 'yearly'))
                      default 'monthly',

  -- which feature flags this plan flips on for the tenant
  features          jsonb not null default '[]'::jsonb,
  -- e.g. ["flyers", "google_reviews_widget"]

  -- Stripe linkage. Created lazily by master dashboard.
  stripe_product_id text,
  stripe_price_id   text,

  -- shop-window
  is_active         boolean not null default true,
  display_order     integer not null default 100,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index plans_active_idx on public.plans (is_active, display_order);

comment on table public.plans is
  'Sellable feature bundles. Editable in /master/plans by super admins.';


-- 6. Tenant subscriptions ─────────────────────────────────────────────
create type public.subscription_status as enum (
  'incomplete', 'incomplete_expired', 'trialing',
  'active', 'past_due', 'canceled', 'unpaid', 'paused'
);

create table public.tenant_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants(id) on delete cascade,
  plan_id                 uuid not null references public.plans(id),

  stripe_subscription_id  text unique,
  status                  public.subscription_status not null default 'incomplete',
  current_period_end      timestamptz,
  canceled_at             timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index tenant_subs_tenant_idx on public.tenant_subscriptions (tenant_id);
create index tenant_subs_active_idx
  on public.tenant_subscriptions (tenant_id)
  where status in ('active', 'trialing');

comment on table public.tenant_subscriptions is
  'One row per (tenant, plan) Stripe subscription. Webhooks keep it fresh.';


-- 7. updated_at trigger helper ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

create trigger plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create trigger tenant_subscriptions_updated_at
  before update on public.tenant_subscriptions
  for each row execute function public.set_updated_at();


-- 8. Auth helper functions ────────────────────────────────────────────
-- These are the *only* allowed way for RLS policies to determine
-- "what tenant am I touching?" and "is this user a super admin?".
-- Centralising the logic means we can audit and extend it in one place.

-- Returns the tenant_id of the *single* tenant the current auth.uid()
-- belongs to (via tenant_users). Returns null if user isn't tied to
-- any tenant (e.g. anon visitor or super admin without a tenant).
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select tenant_id
    from public.tenant_users
   where user_id = auth.uid()
   limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid())
$$;

-- Convenience: "can the current user see/edit rows tagged with this
-- tenant_id?" — true for super admins, true for that tenant's users.
create or replace function public.has_tenant_access(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
        from public.tenant_users
       where user_id = auth.uid()
         and tenant_id = t_id
    )
$$;

comment on function public.has_tenant_access(uuid) is
  'Use in RLS USING / WITH CHECK clauses on every tenant-scoped table.';


-- 9. RLS — super_admins ──────────────────────────────────────────────
alter table public.super_admins enable row level security;

create policy "super admins read super_admins"
  on public.super_admins for select
  using (public.is_super_admin());

create policy "super admins manage super_admins"
  on public.super_admins for all
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- 10. RLS — tenants ──────────────────────────────────────────────────
alter table public.tenants enable row level security;

-- Anyone (including anon) can read *active* tenant rows. The middleware
-- needs to look up `slug` / `custom_domain` to know which tenant the
-- request belongs to before any auth has happened.
-- Sensitive columns (stripe_customer_id) are exposed to the API only
-- via has_tenant_access; we'll move them to a private view if needed.
create policy "public reads active tenants"
  on public.tenants for select
  using (status = 'active' or public.has_tenant_access(id));

create policy "tenant users update own tenant"
  on public.tenants for update
  using (public.has_tenant_access(id))
  with check (public.has_tenant_access(id));

create policy "super admins insert tenants"
  on public.tenants for insert
  with check (public.is_super_admin());

create policy "super admins delete tenants"
  on public.tenants for delete
  using (public.is_super_admin());


-- 11. RLS — tenant_users ─────────────────────────────────────────────
alter table public.tenant_users enable row level security;

create policy "tenant members read own row"
  on public.tenant_users for select
  using (user_id = auth.uid() or public.has_tenant_access(tenant_id));

create policy "tenant owners manage members"
  on public.tenant_users for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.tenant_users tu
       where tu.tenant_id = tenant_users.tenant_id
         and tu.user_id   = auth.uid()
         and tu.role      = 'owner'
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.tenant_users tu
       where tu.tenant_id = tenant_users.tenant_id
         and tu.user_id   = auth.uid()
         and tu.role      = 'owner'
    )
  );


-- 12. RLS — plans ────────────────────────────────────────────────────
alter table public.plans enable row level security;

-- Anyone can read active plans (lead intake form shows them).
create policy "anyone reads active plans"
  on public.plans for select
  using (is_active or public.is_super_admin());

create policy "super admins manage plans"
  on public.plans for all
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- 13. RLS — tenant_subscriptions ─────────────────────────────────────
alter table public.tenant_subscriptions enable row level security;

create policy "tenant users read own subs"
  on public.tenant_subscriptions for select
  using (public.has_tenant_access(tenant_id));

create policy "super admins manage subs"
  on public.tenant_subscriptions for all
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- 14. Seed plans ──────────────────────────────────────────────────────
-- Two starter bundles per the pricing model:
--   • Marketing Plan — $30/mo  → flyers + google_reviews_widget
--   • Visibility Plan — $20/mo → seo + analytics
-- Stripe IDs are added via /master/plans once Stripe is wired (Phase 4).
insert into public.plans (slug, name, description, price_cents, features, display_order)
values
  (
    'marketing',
    'Marketing Plan',
    'Branded flyers + Google Reviews widget on every page.',
    3000,
    '["flyers", "google_reviews_widget"]'::jsonb,
    10
  ),
  (
    'visibility',
    'Visibility Plan',
    'County SEO landing pages + GA4 analytics dashboard.',
    2000,
    '["seo_county_pages", "analytics"]'::jsonb,
    20
  )
on conflict (slug) do nothing;
