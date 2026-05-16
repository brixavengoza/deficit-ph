-- Run once before/after seeding foods.
-- Speeds up substring food search and the small saved/common-food queries used by the app.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS foods_name_trgm_idx
ON public.foods
USING gin (name extensions.gin_trgm_ops)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS foods_user_foods_updated_idx
ON public.foods (owner_user_id, source, updated_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS foods_seed_foods_name_idx
ON public.foods (source, name)
WHERE owner_user_id IS NULL
  AND deleted_at IS NULL;
