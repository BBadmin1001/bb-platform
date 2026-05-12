-- ─────────────────────────────────────────────────────────────────────
-- 0011_sales_rep_auth.sql
--
-- Lets sales reps log in to their own dashboard at /sales (Phase 19).
-- Each `sales_reps` row optionally points at a Supabase auth user;
-- when set, that user can read their own rep row, their own
-- sales_rep_links, and the prospects they brought in.
-- ─────────────────────────────────────────────────────────────────────

alter table public.sales_reps
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- A given auth user can only be one rep.
create unique index if not exists sales_reps_user_idx
  on public.sales_reps (user_id) where user_id is not null;

-- Rep RLS — read self + own links + own prospects.
drop policy if exists "sales reps read self" on public.sales_reps;
create policy "sales reps read self"
  on public.sales_reps for select
  using (user_id = auth.uid());

drop policy if exists "sales reps read own links" on public.sales_rep_links;
create policy "sales reps read own links"
  on public.sales_rep_links for select
  using (
    exists (
      select 1 from public.sales_reps r
      where r.id = sales_rep_links.rep_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "sales reps insert own links" on public.sales_rep_links;
create policy "sales reps insert own links"
  on public.sales_rep_links for insert
  with check (
    exists (
      select 1 from public.sales_reps r
      where r.id = sales_rep_links.rep_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "sales reps update own links" on public.sales_rep_links;
create policy "sales reps update own links"
  on public.sales_rep_links for update
  using (
    exists (
      select 1 from public.sales_reps r
      where r.id = sales_rep_links.rep_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "sales reps read own prospects" on public.prospects;
create policy "sales reps read own prospects"
  on public.prospects for select
  using (
    sales_rep_ref in (
      select slug from public.sales_reps where user_id = auth.uid()
    )
  );

comment on column public.sales_reps.user_id is
  'Supabase auth user the rep signs in as. When set, the rep can access /sales and see their own pipeline.';
