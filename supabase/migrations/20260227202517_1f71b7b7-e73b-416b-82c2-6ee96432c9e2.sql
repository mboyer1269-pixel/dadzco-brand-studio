
-- FIX A: Index on collections(user_id, id) for ownership checks
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id, id);

-- FIX B: designs.created_at already has NOT NULL DEFAULT now() per schema — no change needed
-- Note: collection_items.design_id is already a FK to designs, 1:1 enforced by the FK itself
