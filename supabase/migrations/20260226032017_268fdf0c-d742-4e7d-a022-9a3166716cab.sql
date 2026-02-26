-- Fix all tables with RESTRICTIVE-only policies → replace with PERMISSIVE

-- collections
DROP POLICY IF EXISTS "Admin full access collections" ON public.collections;
CREATE POLICY "Admin full access collections"
  ON public.collections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- collection_items
DROP POLICY IF EXISTS "Admin full access collection_items" ON public.collection_items;
CREATE POLICY "Admin full access collection_items"
  ON public.collection_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- designs
DROP POLICY IF EXISTS "Admin full access designs" ON public.designs;
CREATE POLICY "Admin full access designs"
  ON public.designs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- design_versions
DROP POLICY IF EXISTS "Admin full access design_versions" ON public.design_versions;
CREATE POLICY "Admin full access design_versions"
  ON public.design_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- design_tags
DROP POLICY IF EXISTS "Admin full access design_tags" ON public.design_tags;
CREATE POLICY "Admin full access design_tags"
  ON public.design_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- planner_tasks
DROP POLICY IF EXISTS "Admin full access planner_tasks" ON public.planner_tasks;
CREATE POLICY "Admin full access planner_tasks"
  ON public.planner_tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- stories
DROP POLICY IF EXISTS "Admin full access stories" ON public.stories;
CREATE POLICY "Admin full access stories"
  ON public.stories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- exports
DROP POLICY IF EXISTS "Admin full access exports" ON public.exports;
CREATE POLICY "Admin full access exports"
  ON public.exports FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- tags
DROP POLICY IF EXISTS "Admin full access tags" ON public.tags;
CREATE POLICY "Admin full access tags"
  ON public.tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- strategic_alerts
DROP POLICY IF EXISTS "Admin full access strategic_alerts" ON public.strategic_alerts;
CREATE POLICY "Admin full access strategic_alerts"
  ON public.strategic_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles (SELECT only, keep restrictive for non-admin)
DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));