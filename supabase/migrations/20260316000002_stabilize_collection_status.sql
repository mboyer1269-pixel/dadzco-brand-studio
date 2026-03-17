-- Migration B: Stabilize collection status fields
--
-- lifecycle_status becomes the single canonical progression field.
-- status is deprecated and maintained automatically by a sync trigger.
--
-- 1. Drop broken CHECK on status (already violated by Edge Functions)
-- 2. Add CHECK on lifecycle_status (enforce valid enum values)
-- 3. Create sync trigger: lifecycle_status → status shadow
-- 4. Backfill existing rows
-- 5. Add column comments

-- ─── 1. Drop the broken CHECK constraint on status ──────────────────
ALTER TABLE public.collections
  DROP CONSTRAINT IF EXISTS collections_status_check;

-- ─── 1b. Re-add a clean CHECK on status (shadow values only) ────────
ALTER TABLE public.collections
  ADD CONSTRAINT collections_status_shadow_check
  CHECK (status IN ('draft', 'in_progress', 'completed', 'archived'));

-- ─── 2. Add CHECK constraint on lifecycle_status ────────────────────
ALTER TABLE public.collections
  ADD CONSTRAINT collections_lifecycle_status_check
  CHECK (lifecycle_status IN (
    'idea',
    'strategy_review',
    'mockup_stage',
    'approved_for_production',
    'in_production',
    'ready_for_export',
    'exported'
  ));

-- ─── 2b. Enforce NOT NULL and DEFAULT on lifecycle_status ────────────
ALTER TABLE public.collections
  ALTER COLUMN lifecycle_status SET NOT NULL;
ALTER TABLE public.collections
  ALTER COLUMN lifecycle_status SET DEFAULT 'idea';

-- ─── 3. Shadow-sync trigger: lifecycle_status → status ──────────────
CREATE OR REPLACE FUNCTION public.sync_status_from_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lifecycle_status IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.status := CASE NEW.lifecycle_status
    WHEN 'idea'                    THEN 'draft'
    WHEN 'strategy_review'         THEN 'in_progress'
    WHEN 'mockup_stage'            THEN 'in_progress'
    WHEN 'approved_for_production' THEN 'in_progress'
    WHEN 'in_production'           THEN 'in_progress'
    WHEN 'ready_for_export'        THEN 'completed'
    WHEN 'exported'                THEN 'completed'
    ELSE NEW.status
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_collection_status ON public.collections;
CREATE TRIGGER sync_collection_status
  BEFORE INSERT OR UPDATE OF lifecycle_status
  ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.sync_status_from_lifecycle();

-- ─── 4. Backfill existing rows ──────────────────────────────────────
UPDATE public.collections
SET status = CASE lifecycle_status
  WHEN 'idea'                    THEN 'draft'
  WHEN 'strategy_review'         THEN 'in_progress'
  WHEN 'mockup_stage'            THEN 'in_progress'
  WHEN 'approved_for_production' THEN 'in_progress'
  WHEN 'in_production'           THEN 'in_progress'
  WHEN 'ready_for_export'        THEN 'completed'
  WHEN 'exported'                THEN 'completed'
  ELSE status
END;

-- ─── 5. Column comments ─────────────────────────────────────────────
COMMENT ON COLUMN public.collections.status IS
  'DEPRECATED — shadow field kept for UI compatibility only. '
  'Canonical field is lifecycle_status. Do not write directly. '
  'Maintained automatically by sync_collection_status trigger.';

COMMENT ON COLUMN public.collections.lifecycle_status IS
  'CANONICAL progression field. Valid values: idea, strategy_review, '
  'mockup_stage, approved_for_production, in_production, '
  'ready_for_export, exported. All gate logic uses this field.';
