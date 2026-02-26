-- Fix brand_files: drop restrictive policy, create permissive one
DROP POLICY IF EXISTS "Admin full access brand_files" ON public.brand_files;
CREATE POLICY "Admin full access brand_files"
  ON public.brand_files
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix brand_rules: drop restrictive policy, create permissive one
DROP POLICY IF EXISTS "Admin full access brand_rules" ON public.brand_rules;
CREATE POLICY "Admin full access brand_rules"
  ON public.brand_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));