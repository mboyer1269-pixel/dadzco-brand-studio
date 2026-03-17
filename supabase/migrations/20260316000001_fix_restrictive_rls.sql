-- Migration A: Fix RESTRICTIVE RLS on collection_scores and ai_generation_logs
--
-- Bug: Migration 20260227012959 created these policies with AS RESTRICTIVE.
-- With no accompanying PERMISSIVE policy, all rows are blocked — even for admins.
-- Fix: drop and recreate as standard PERMISSIVE policies.

-- collection_scores
DROP POLICY IF EXISTS "Admin full access collection_scores" ON public.collection_scores;
CREATE POLICY "Admin full access collection_scores"
  ON public.collection_scores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ai_generation_logs
DROP POLICY IF EXISTS "Admin full access ai_generation_logs" ON public.ai_generation_logs;
CREATE POLICY "Admin full access ai_generation_logs"
  ON public.ai_generation_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
