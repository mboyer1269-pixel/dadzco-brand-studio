
-- FIX 1: Add version column to export_packs
ALTER TABLE public.export_packs ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- FIX 2: Add unique constraint on brand_rules(user_id) — keep only latest per user
-- First, deduplicate if needed (keep most recent)
DELETE FROM public.brand_rules a USING public.brand_rules b
WHERE a.user_id = b.user_id AND a.updated_at < b.updated_at;

ALTER TABLE public.brand_rules ADD CONSTRAINT brand_rules_user_id_unique UNIQUE (user_id);
