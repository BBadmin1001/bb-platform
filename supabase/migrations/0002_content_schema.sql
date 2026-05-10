-- ─────────────────────────────────────────────────────────────────────
-- 0002_content_schema.sql
--
-- All the tables that drive a tenant's public site + admin panel.
-- Ported from samina-website's 0001_init through 0012_county_landing_*
-- and rewritten to be **tenant-scoped** from row 1.
--
-- Pattern for every table:
--   • tenant_id uuid not null references public.tenants(id)
--   • RLS enabled
--   • anon SELECT permitted only when tenant.status = 'active'
--     and (where applicable) the row's visibility flag is true
--   • tenant_users (resolved via has_tenant_access) can do anything
--     for their own tenant
--   • super_admins bypass everything
--
-- Tables created (in dependency order):
--   media, content_blocks, content_history, communities, closings,
--   reviews, review_submissions, partner_categories, partners,
--   forms, leads, open_houses, integrations, county_landing_pages
--
-- The samina `team_members` table is deliberately **not** ported —
-- foundation's `tenant_users` already covers admin assignment, with
-- the role enum trimmed to ('owner', 'editor').
-- ─────────────────────────────────────────────────────────────────────

-- helper: scope an "anon can read" policy to active tenants only.
-- Inlined into each policy below for clarity.

-- 1. MEDIA ─────────────────────────────────────────────────────────────
create table public.media (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,

  kind                 text not null check (kind in ('image', 'youtube')),
  cloudinary_public_id text,
  url                  text not null,
  alt                  text,
  width                int,
  height               int,

  uploaded_at          timestamptz not null default now(),
  uploaded_by          uuid references auth.users(id) on delete set null
);
create index media_tenant_idx on public.media (tenant_id);

-- 2. CONTENT_BLOCKS ─────────────────────────────────────────────────────
-- The keyed text/JSON store every page reads from.
-- (page, key) is unique *per tenant*.
create table public.content_blocks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,

  page        text not null,
  key         text not null,
  value       text,

  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,

  unique (tenant_id, page, key)
);
create index content_blocks_tenant_page_idx on public.content_blocks (tenant_id, page);

-- 3. CONTENT_HISTORY (block versions, 30-day rolling) ───────────────────
create table public.content_history (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  block_id   uuid not null references public.content_blocks(id) on delete cascade,

  page       text not null,
  key        text not null,
  value      text,

  saved_at   timestamptz not null default now(),
  saved_by   uuid references auth.users(id) on delete set null
);
create index content_history_block_idx on public.content_history (block_id);
create index content_history_saved_at_idx on public.content_history (saved_at);

-- 4. COMMUNITIES ────────────────────────────────────────────────────────
create table public.communities (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,

  slug                text not null,
  name                text not null,
  state               text not null default 'Virginia',
  tagline             text,
  about               text,
  market_year_summary text,
  samina_quote        text,
  median_price        text,
  yoy_change          text,
  yoy_direction       text check (yoy_direction in ('up', 'down', 'flat')),
  days_on_market      text,
  market_type         text,
  data_year           int not null default extract(year from now()),

  image_id            uuid references public.media(id) on delete set null,
  image_crop          jsonb,
  hero_image_id       uuid references public.media(id) on delete set null,
  hero_image_crop     jsonb,

  price_tiers         jsonb not null default '[]'::jsonb,
  life                jsonb not null default '{}'::jsonb,

  display_order       int not null default 0,
  is_visible          boolean not null default true,
  updated_at          timestamptz not null default now(),

  unique (tenant_id, slug)
);
create index communities_tenant_visible_idx
  on public.communities (tenant_id, is_visible, display_order);

-- 5. CLOSINGS ───────────────────────────────────────────────────────────
create table public.closings (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  image_id      uuid references public.media(id) on delete set null,
  image_crop    jsonb,
  neighborhood  text,
  city          text,
  state         text default 'VA',
  closed_year   int,
  display_order int not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);
create index closings_tenant_visible_idx
  on public.closings (tenant_id, is_visible, display_order);

-- 6. REVIEWS ────────────────────────────────────────────────────────────
create table public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,

  source               text not null
    check (source in ('manual', 'google', 'zillow', 'realtor', 'internal')),
  external_id          text,
  author_name          text,
  author_short_label   text,
  rating               int default 5 check (rating between 1 and 5),
  quote                text not null,
  written_at           timestamptz default now(),

  status               text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  is_featured_homepage boolean not null default false,
  display_order        int not null default 0,
  is_visible           boolean not null default true,
  created_at           timestamptz not null default now(),

  unique (tenant_id, source, external_id)
);
create index reviews_tenant_visible_idx
  on public.reviews (tenant_id, is_visible, display_order);
create index reviews_tenant_status_idx
  on public.reviews (tenant_id, status);

-- 7. REVIEW_SUBMISSIONS (public form lands here) ────────────────────────
create table public.review_submissions (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,

  author_name              text,
  author_email             text,
  author_phone             text,
  rating                   int default 5 check (rating between 1 and 5),
  quote                    text not null,
  consent_post_to_google   boolean not null default false,
  kind                     text not null default 'public'
    check (kind in ('public', 'internal')),

  status                   text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at             timestamptz not null default now(),
  reviewed_at              timestamptz,
  reviewed_by              uuid references auth.users(id) on delete set null
);
create index review_subs_tenant_status_idx
  on public.review_submissions (tenant_id, status, submitted_at desc);

-- 8. PARTNER_CATEGORIES + PARTNERS ──────────────────────────────────────
create table public.partner_categories (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  title         text not null,
  description   text,
  display_order int not null default 0,
  is_visible    boolean not null default true
);
create index partner_cats_tenant_idx on public.partner_categories (tenant_id, display_order);

create table public.partners (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,

  category_id   uuid references public.partner_categories(id) on delete set null,
  name          text not null,
  role          text,
  company       text,
  phone         text,
  email         text,
  photo_id      uuid references public.media(id) on delete set null,
  photo_crop    jsonb,
  logo_id       uuid references public.media(id) on delete set null,
  logo_crop     jsonb,

  display_order int not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);
create index partners_tenant_cat_idx
  on public.partners (tenant_id, category_id, display_order);

-- 9. FORMS + LEADS ──────────────────────────────────────────────────────
create table public.forms (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,

  slug            text not null,
  title           text not null,
  description     text,
  fields          jsonb not null default '[]'::jsonb,
  submit_label    text default 'Submit',
  success_message text default 'Thanks — we''ll be in touch shortly.',
  notify_email    text,
  is_published    boolean not null default true,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (tenant_id, slug)
);

create table public.leads (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,

  source       text not null,
  form_id      uuid references public.forms(id) on delete set null,
  data         jsonb not null default '{}'::jsonb,

  name         text,
  email        text,
  phone        text,
  message      text,
  ip_address   text,
  user_agent   text,

  status       text not null default 'new'
    check (status in ('new', 'in-progress', 'closed')),
  submitted_at timestamptz not null default now()
);
create index leads_tenant_status_idx
  on public.leads (tenant_id, status, submitted_at desc);

-- 10. OPEN_HOUSES ───────────────────────────────────────────────────────
create table public.open_houses (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,

  slug              text not null,
  heading           text not null,
  address           text not null,

  city              text,
  state_full        text,
  postal_code       text,

  open_date         date,
  open_time_label   text,
  open_date_2       date,
  open_time_label_2 text,

  hero_image_id     uuid references public.media(id) on delete set null,
  hero_image_crop   jsonb,
  second_image_id   uuid references public.media(id) on delete set null,
  second_image_crop jsonb,
  third_image_id    uuid references public.media(id) on delete set null,
  third_image_crop  jsonb,

  features          text[] not null default '{}',
  bedrooms          int,
  bathrooms         numeric(3,1),
  garage_spaces     int not null default 0,
  mls_id            text,
  description       text,

  form_id           uuid references public.forms(id) on delete set null,

  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (tenant_id, slug)
);
create index open_houses_tenant_pub_idx
  on public.open_houses (tenant_id, is_published, open_date desc);

-- 11. INTEGRATIONS (per-tenant 3rd-party credentials) ───────────────────
create table public.integrations (
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  key              text not null,            -- 'google_places', 'mailchimp', etc.
  config           jsonb not null default '{}'::jsonb,
  enabled          boolean not null default true,
  last_synced_at   timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'error')),
  last_sync_error  text,
  updated_by       uuid references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now(),
  primary key (tenant_id, key)
);

-- 12. COUNTY_LANDING_PAGES ──────────────────────────────────────────────
create table public.county_landing_pages (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants(id) on delete cascade,

  slug                     text not null,
  county_name              text not null,
  state_abbr               text not null,
  state_name               text not null,

  custom_heading           text,
  custom_intro             text,
  custom_meta_description  text,

  hero_image_id            uuid references public.media(id) on delete set null,
  zip_codes                text[] not null default '{}',
  service_areas            text[] not null default '{}',

  is_published             boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  unique (tenant_id, slug)
);
create index county_lp_tenant_pub_idx
  on public.county_landing_pages (tenant_id, is_published);


-- ── updated_at triggers ─────────────────────────────────────────────────
create trigger content_blocks_updated_at
  before update on public.content_blocks
  for each row execute function public.set_updated_at();
create trigger communities_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();
create trigger forms_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();
create trigger open_houses_updated_at
  before update on public.open_houses
  for each row execute function public.set_updated_at();
create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();
create trigger county_landing_pages_updated_at
  before update on public.county_landing_pages
  for each row execute function public.set_updated_at();


-- ── RLS ────────────────────────────────────────────────────────────────
-- Apply the same pattern to every tenant-scoped table:
--   1. anon SELECT: visible rows on active tenants only
--   2. authenticated SELECT/INSERT/UPDATE/DELETE: has_tenant_access
--   3. super admins: anything
--
-- "Visible" is per-table (is_visible / is_published / status='approved'…).
-- The patterns are written explicitly per table for clarity rather than
-- generated, so you can audit each one.

alter table public.media                 enable row level security;
alter table public.content_blocks        enable row level security;
alter table public.content_history       enable row level security;
alter table public.communities           enable row level security;
alter table public.closings              enable row level security;
alter table public.reviews               enable row level security;
alter table public.review_submissions    enable row level security;
alter table public.partner_categories    enable row level security;
alter table public.partners              enable row level security;
alter table public.forms                 enable row level security;
alter table public.leads                 enable row level security;
alter table public.open_houses           enable row level security;
alter table public.integrations          enable row level security;
alter table public.county_landing_pages  enable row level security;

-- helper predicate used inline: tenant exists & is active
-- Rather than a function (slow + needs security definer), we inline a
-- subquery against tenants.

-- MEDIA — anon can read images on active tenants (so <Image src=…> works);
-- tenant users can do everything.
create policy "media public read"
  on public.media for select
  using (
    exists (select 1 from public.tenants t
            where t.id = media.tenant_id and t.status = 'active')
  );
create policy "media tenant write"
  on public.media for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- CONTENT_BLOCKS
create policy "content_blocks public read"
  on public.content_blocks for select
  using (
    exists (select 1 from public.tenants t
            where t.id = content_blocks.tenant_id and t.status = 'active')
  );
create policy "content_blocks tenant write"
  on public.content_blocks for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- CONTENT_HISTORY — tenant only
create policy "content_history tenant"
  on public.content_history for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- COMMUNITIES — anon sees is_visible=true rows; tenant sees all
create policy "communities public read"
  on public.communities for select
  using (
    is_visible
    and exists (select 1 from public.tenants t
                where t.id = communities.tenant_id and t.status = 'active')
  );
create policy "communities tenant access"
  on public.communities for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- CLOSINGS
create policy "closings public read"
  on public.closings for select
  using (
    is_visible
    and exists (select 1 from public.tenants t
                where t.id = closings.tenant_id and t.status = 'active')
  );
create policy "closings tenant access"
  on public.closings for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- REVIEWS — anon sees approved + visible
create policy "reviews public read"
  on public.reviews for select
  using (
    is_visible
    and status = 'approved'
    and exists (select 1 from public.tenants t
                where t.id = reviews.tenant_id and t.status = 'active')
  );
create policy "reviews tenant access"
  on public.reviews for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- REVIEW_SUBMISSIONS — anon may INSERT; tenant may read/update
create policy "review_submissions anon insert"
  on public.review_submissions for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.tenants t
            where t.id = review_submissions.tenant_id and t.status = 'active')
  );
create policy "review_submissions tenant access"
  on public.review_submissions for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- PARTNER_CATEGORIES
create policy "partner_categories public read"
  on public.partner_categories for select
  using (
    is_visible
    and exists (select 1 from public.tenants t
                where t.id = partner_categories.tenant_id and t.status = 'active')
  );
create policy "partner_categories tenant access"
  on public.partner_categories for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- PARTNERS
create policy "partners public read"
  on public.partners for select
  using (
    is_visible
    and exists (select 1 from public.tenants t
                where t.id = partners.tenant_id and t.status = 'active')
  );
create policy "partners tenant access"
  on public.partners for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- FORMS — anon sees published forms (PublicFormRenderer needs to read fields)
create policy "forms public read"
  on public.forms for select
  using (
    is_published
    and exists (select 1 from public.tenants t
                where t.id = forms.tenant_id and t.status = 'active')
  );
create policy "forms tenant access"
  on public.forms for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- LEADS — anon may INSERT; tenant may read/update
create policy "leads anon insert"
  on public.leads for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.tenants t
            where t.id = leads.tenant_id and t.status = 'active')
  );
create policy "leads tenant access"
  on public.leads for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- OPEN_HOUSES — anon sees published rows
create policy "open_houses public read"
  on public.open_houses for select
  using (
    is_published
    and exists (select 1 from public.tenants t
                where t.id = open_houses.tenant_id and t.status = 'active')
  );
create policy "open_houses tenant access"
  on public.open_houses for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- INTEGRATIONS — tenant only (these are credentials)
create policy "integrations tenant only"
  on public.integrations for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));

-- COUNTY_LANDING_PAGES — anon sees published rows
create policy "county_lp public read"
  on public.county_landing_pages for select
  using (
    is_published
    and exists (select 1 from public.tenants t
                where t.id = county_landing_pages.tenant_id and t.status = 'active')
  );
create policy "county_lp tenant access"
  on public.county_landing_pages for all
  using (public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));


-- ── HISTORY CLEANUP ────────────────────────────────────────────────────
-- Keep samina's 30-day history rolling purge. Runs as super admin via
-- service role (Supabase Edge Function or pg_cron). Untouched per-tenant.
create or replace function public.purge_old_content_history()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.content_history
  where saved_at < now() - interval '30 days';
end;
$$;
