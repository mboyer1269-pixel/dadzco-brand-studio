CREATE TABLE IF NOT EXISTS public.strategic_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  category TEXT NOT NULL DEFAULT 'gate',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_day INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.strategic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access strategic_alerts"
  ON public.strategic_alerts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));