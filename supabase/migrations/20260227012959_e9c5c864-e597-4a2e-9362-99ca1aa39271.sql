
-- 1. Create collection_status enum type
DO $$ BEGIN
  CREATE TYPE public.collection_lifecycle_status AS ENUM (
    'idea',
    'strategy_review', 
    'mockup_stage',
    'approved_for_production',
    'in_production',
    'ready_for_export',
    'exported'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add lifecycle columns to collections table
ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS final_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adn_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_gate_passed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_score numeric DEFAULT 0;

-- 3. Create collection_scores table for detailed scoring
CREATE TABLE IF NOT EXISTS public.collection_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  adn_alignment numeric NOT NULL DEFAULT 0,
  anti_kitsch_compliance numeric NOT NULL DEFAULT 0,
  market_differentiation numeric NOT NULL DEFAULT 0,
  viral_potential numeric NOT NULL DEFAULT 0,
  pod_feasibility numeric NOT NULL DEFAULT 0,
  margin_strength numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  scored_at timestamp with time zone NOT NULL DEFAULT now(),
  scored_by text DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create ai_generation_logs table for model routing tracking
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type text NOT NULL,
  model_used text NOT NULL,
  model_provider text NOT NULL,
  fallback_used boolean DEFAULT false,
  fallback_from text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  duration_ms integer DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  design_id uuid REFERENCES public.designs(id) ON DELETE SET NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. RLS policies for new tables
ALTER TABLE public.collection_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access collection_scores" ON public.collection_scores
  AS RESTRICTIVE FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin full access ai_generation_logs" ON public.ai_generation_logs
  AS RESTRICTIVE FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
