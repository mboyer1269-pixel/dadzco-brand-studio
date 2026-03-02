
-- Add missing columns to collection_items for supplier routing & production spec
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'printful',
  ADD COLUMN IF NOT EXISTS print_type text,
  ADD COLUMN IF NOT EXISTS design_prompt text,
  ADD COLUMN IF NOT EXISTS negative_prompt text,
  ADD COLUMN IF NOT EXISTS aop_spec jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.collection_items.provider IS 'printful or kin_custom';
COMMENT ON COLUMN public.collection_items.print_type IS 'DTG, Embroidery, AOP';
COMMENT ON COLUMN public.collection_items.aop_spec IS 'Kin Custom only: tile size, repeat rules, panel mapping';
