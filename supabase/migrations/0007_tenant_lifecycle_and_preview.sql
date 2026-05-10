-- ─────────────────────────────────────────────────────────────────────
-- 0007_tenant_lifecycle_and_preview.sql
--
-- Phase 9 — explicit operational lifecycle on tenants, separate from
-- the publishing `status` enum.
--
-- Why a separate column? `status` (pending/active/suspended/archived)
-- governs whether the tenant is publicly visible — RLS policies key
-- off it. We don't want every internal workflow nuance to flip
-- visibility on/off. So we add a workflow-only `lifecycle_stage`:
--
--   intake             — provisioned from a paid prospect, content
--                        seeded from intake_data, polish team hasn't
--                        touched it yet
--   polishing          — internal team is actively editing
--   ready_for_review   — polished, sent client a preview link, awaiting approval
--   ready_for_domain   — client approved, awaiting them to point DNS
--   live               — domain verified + status flipped to active
--
-- Plus a `preview_token` UUID so the polish team can share a
-- previewable URL with the client before the tenant is `active`. The
-- proxy resolver honours this token to show the in-progress site
-- regardless of status.
-- ─────────────────────────────────────────────────────────────────────

alter table public.tenants
  add column if not exists lifecycle_stage text
    not null default 'intake'
    check (lifecycle_stage in (
      'intake',
      'polishing',
      'ready_for_review',
      'ready_for_domain',
      'live'
    ));

-- Random UUID for each row. Once set, never auto-rotated — it's the
-- shared secret in the preview URL the team mails the client.
alter table public.tenants
  add column if not exists preview_token uuid not null default gen_random_uuid();

-- Fast preview-token lookup at the edge.
create unique index if not exists tenants_preview_token_idx
  on public.tenants (preview_token);

comment on column public.tenants.lifecycle_stage is
  'Operational workflow stage: intake → polishing → ready_for_review → ready_for_domain → live. Decoupled from `status` (which is the publishing visibility flag).';
comment on column public.tenants.preview_token is
  'Shared in URLs like /?preview=<token>&tenant=<slug> to let pre-launch clients view the polished site before status flips to active.';
