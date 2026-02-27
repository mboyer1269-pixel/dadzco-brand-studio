
-- 1. collection_events: audit log for lifecycle transitions
CREATE TABLE public.collection_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  gate_results JSONB DEFAULT '[]'::jsonb,
  forced BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.collection_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access collection_events" ON public.collection_events AS RESTRICTIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. export_packs
CREATE TABLE public.export_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  folder_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.export_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access export_packs" ON public.export_packs AS RESTRICTIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. export_pack_items
CREATE TABLE public.export_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  export_pack_id UUID NOT NULL REFERENCES public.export_packs(id) ON DELETE CASCADE,
  sku_name TEXT NOT NULL,
  product_type TEXT,
  retail_price_cad NUMERIC,
  cost_cad NUMERIC,
  margin NUMERIC,
  mockup_url TEXT,
  printfile_placeholders JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.export_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access export_pack_items" ON public.export_pack_items AS RESTRICTIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. production_jobs
CREATE TABLE public.production_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  sku_id TEXT,
  provider TEXT NOT NULL DEFAULT 'leonardo',
  model_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  image_url TEXT,
  cost_estimate NUMERIC DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access production_jobs" ON public.production_jobs AS RESTRICTIVE FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add rules_locked to brand_rules
ALTER TABLE public.brand_rules ADD COLUMN IF NOT EXISTS rules_locked BOOLEAN NOT NULL DEFAULT false;
