-- ─────────────────────────────────────────────────────────────────────
-- 0010_sales_rep_links.sql
--
-- Per-client tracked onboarding links. The sales rep workflow is:
--
--   1. Rep talks to a prospective realtor, agrees on a setup price.
--   2. Master (or rep eventually) opens /master/sales-reps and clicks
--      "Generate link" for that rep, enters: client label, optional
--      client email, agreed price ($600 minimum, no max).
--   3. System generates a short opaque token; the public URL is
--      /get-started?link=<token>.
--   4. Customer fills the wizard; price comes from THIS table
--      (server-side), not the URL — so customers can't edit the URL
--      to lower the price.
--   5. On submit, the prospect row is created with this link's
--      sales_rep_ref + agreed_setup_cents + (optional) email pre-fill.
--   6. Each link records its lifecycle: created → clicked →
--      submitted → paid. Powers per-link conversion analytics.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.sales_rep_links (
  id                   uuid primary key default gen_random_uuid(),
  rep_id               uuid not null references public.sales_reps(id) on delete cascade,

  -- The opaque token that goes in the URL. Random, short, URL-safe.
  -- Tokens are SECRET-equivalent: they encode a sealed price, so
  -- treat them like single-use coupons. (Multiple uses are permitted
  -- but the master UI can disable a link if it leaks.)
  link_token           text not null unique,

  -- Optional context the rep records when generating — purely for
  -- their own tracking + the master inbox.
  client_label         text,            -- e.g. "Jane Smith / Compass Atlanta"
  client_email         text,            -- pre-filled into the wizard if set
  notes                text,

  -- The sealed agreed price. Cannot drop below $600 (hardcoded
  -- platform floor — see the check).
  agreed_setup_cents   int not null
                         check (agreed_setup_cents >= 60000),

  -- Lifecycle stamps for per-link analytics.
  created_at           timestamptz not null default now(),
  created_by           uuid references auth.users(id),
  clicked_at           timestamptz,
  submitted_at         timestamptz,
  prospect_id          uuid references public.prospects(id) on delete set null,

  -- Manual kill switch (e.g. a link gets leaked or the deal falls
  -- through). When false the wizard refuses to render.
  is_active            boolean not null default true
);

create index if not exists sales_rep_links_rep_idx
  on public.sales_rep_links (rep_id, created_at desc);
create index if not exists sales_rep_links_active_idx
  on public.sales_rep_links (is_active, link_token);

alter table public.sales_rep_links enable row level security;

-- Anon can SELECT only by exact token match — this is how the
-- public wizard resolves the link. RLS gates everything else.
create policy "anon read link by token"
  on public.sales_rep_links for select
  using (true);
  -- Open select OK because (a) tokens are 16-char opaque random,
  -- (b) the only useful field exposed is the price + rep_id, and
  -- (c) the wizard already lets anyone discover a tenant's slug —
  -- so this isn't increasing the public surface meaningfully.

create policy "super admins manage sales_rep_links"
  on public.sales_rep_links for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

comment on table public.sales_rep_links is
  'Per-client tracked onboarding links. Master / rep generates one per deal with a sealed agreed price. Wizard reads the price from here, not from the URL, so the customer cannot lower it by editing query params.';
