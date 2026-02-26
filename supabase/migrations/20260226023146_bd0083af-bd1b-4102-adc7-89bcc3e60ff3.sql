
CREATE TABLE public.brand_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_file_id uuid REFERENCES public.brand_files(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  palette jsonb DEFAULT '[]'::jsonb,
  forbidden_keywords jsonb DEFAULT '[]'::jsonb,
  typography jsonb DEFAULT '[]'::jsonb,
  raw_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access brand_rules" ON public.brand_rules
  AS RESTRICTIVE FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_brand_rules_updated_at
  BEFORE UPDATE ON public.brand_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
