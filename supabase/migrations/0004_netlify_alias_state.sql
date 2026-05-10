-- ─────────────────────────────────────────────────────────────────────
-- 0004_netlify_alias_state.sql
--
-- Tracks whether a tenant's custom_domain has been registered as a
-- domain alias on the Netlify site that hosts the platform. The
-- master tenant actions call Netlify's API to add/remove the alias
-- in step with custom_domain changes; these columns record the
-- result so we can:
--
--   • show "alias added" / "alias error" on the master domain panel
--   • retry from a button when something goes wrong (Netlify down,
--     token rotated, etc.)
--   • avoid double-adding when a customer changes domain back-and-
--     forth
--
-- We store the bare error message rather than a structured code —
-- Netlify's API is small enough that the message is the friendliest
-- thing to show and act on.
-- ─────────────────────────────────────────────────────────────────────

alter table public.tenants
  add column if not exists netlify_alias_added_at  timestamptz,
  add column if not exists netlify_alias_synced_for text,  -- the domain value at last successful sync
  add column if not exists netlify_alias_error    text,
  add column if not exists netlify_last_synced_at timestamptz;

comment on column public.tenants.netlify_alias_synced_for is
  'The custom_domain value at the moment of last successful Netlify sync. Different from custom_domain means the domain has changed since and a re-sync is needed.';
