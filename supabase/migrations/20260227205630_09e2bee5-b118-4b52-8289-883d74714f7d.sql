
-- Safe dedupe: keep only the most recently updated brand_rules row per user
DELETE FROM public.brand_rules a
USING public.brand_rules b
WHERE a.user_id = b.user_id
  AND a.id <> b.id
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.id < b.id)
  );

-- Ensure unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brand_rules_user_id_unique'
  ) THEN
    ALTER TABLE public.brand_rules ADD CONSTRAINT brand_rules_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
