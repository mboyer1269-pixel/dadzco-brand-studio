
-- Add performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_collection_id ON public.ai_generation_logs (collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON public.ai_generation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON public.ai_generation_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_collection_scores_collection_id ON public.collection_scores (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_scores_created_at ON public.collection_scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items (collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_lifecycle_status ON public.collections (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id);
