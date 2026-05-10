-- ─────────────────────────────────────────────────────────────────────
-- 0009_custom_pages.sql
--
-- Tenant-scoped custom pages — for things like "Fix & Flip", "For
-- Investors", "First-Time Buyers Workshop", "Free Home Valuation",
-- whatever a particular realtor wants on their site that isn't in the
-- standard template.
--
-- Lifecycle:
--   1. Realtor asks the platform team for a new page.
--   2. Master creates a row here from /master/tenants/[slug] —
--      sets the slug (URL) and a starting title; body can be empty.
--   3. Realtor takes over from /admin/pages — edits title + body
--      content, can publish/unpublish, can choose whether to
--      surface the page in their main nav.
--   4. Public visitors hit /p/<slug> on the realtor's domain.
--
-- Why don't realtors create pages themselves? Two reasons:
--   • Slug uniqueness + collision with existing top-level routes
--     (/buyers, /sellers, /communities, etc.) needs human review.
--   • Most realtors don't actually need a custom page; the ones who
--     do tend to want help shaping it. Funnel through master is fine.
--
-- The body is stored as Markdown so the realtor can edit a calm
-- textarea (with a help line for syntax) and we render rich HTML on
-- the public side.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.custom_pages (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,

  slug         text not null
                 check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  title        text not null,

  -- Markdown body. Empty when master creates the page; the realtor
  -- fills it in. Renders to HTML on the public side via lib/markdown.
  body_md      text not null default '',

  -- Optional SEO meta description. Falls through to a default
  -- generated from the title when blank.
  meta_description text,

  -- Toggles
  is_published   boolean not null default true,
  show_in_nav    boolean not null default false,
                 -- when true, the public Header/MenuDrawer adds a
                 -- top-level link to /p/<slug>

  display_order  int not null default 100,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Slug must be unique within a tenant (different tenants can each
  -- have a /p/investors page).
  unique (tenant_id, slug)
);

create index if not exists custom_pages_tenant_published_idx
  on public.custom_pages (tenant_id, is_published, display_order);

create trigger custom_pages_updated_at
  before update on public.custom_pages
  for each row execute function public.set_updated_at();


-- ── RLS ────────────────────────────────────────────────────────────
alter table public.custom_pages enable row level security;

-- Anon visitors can read published pages on active tenants (drives
-- the public /p/<slug> route).
create policy "custom_pages public read"
  on public.custom_pages for select
  using (
    is_published
    and exists (
      select 1 from public.tenants t
      where t.id = custom_pages.tenant_id and t.status = 'active'
    )
  );

-- Tenant members read + update their own. They CANNOT INSERT or
-- DELETE — those operations are reserved for super admins (creating
-- and removing pages is funnelled through master).
create policy "custom_pages tenant read"
  on public.custom_pages for select
  using (public.has_tenant_access(tenant_id));

create policy "custom_pages tenant update"
  on public.custom_pages for update
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- Super admins do anything (the platform team).
create policy "custom_pages super admin all"
  on public.custom_pages for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

comment on table public.custom_pages is
  'Per-tenant custom pages (e.g. /p/fix-and-flip, /p/investors). Master creates them, the realtor edits content from /admin/pages.';
