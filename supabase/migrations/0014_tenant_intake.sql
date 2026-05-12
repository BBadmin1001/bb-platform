-- Phase 32 — store intake-style realtor data on tenants created by hand
-- from master.
--
-- Background: `prospects.intake_data` (added in 0006) holds the rich
-- onboarding-wizard payload (bio, voice, service areas, languages,
-- licensed states, social, photos, etc.). It's only populated for
-- tenants that came through the public wizard.
--
-- Tenants created manually by master operators have only the basic
-- identity columns on the tenants row (realtor_name, brokerage,
-- state_abbr). AI Polish runs against `intake_data` to generate
-- bespoke copy, so a hand-created tenant gets a generic polish.
--
-- This migration adds an `intake_data jsonb` column on tenants so
-- master can fill in the same questionnaire after manual creation —
-- giving AI Polish enough context to write tenant-specific copy.
--
-- Shape matches `IntakeData` in lib/intakeSchema.ts. Nullable +
-- unindexed: nothing queries it, it's read whole on polish.

alter table public.tenants
  add column if not exists intake_data jsonb;

comment on column public.tenants.intake_data is
  'Rich intake (same shape as prospects.intake_data / IntakeData). '
  'For master-created tenants, the polish form on /master/tenants/'
  '[slug]/intake writes here. Wizard-created tenants leave this null '
  'and AI polish falls back to prospects.intake_data.';
