-- Migration D: 3 Seals domain
-- Creates collection_seals and seal_audit_log.
-- RLS: admin-only on both tables. seal_audit_log is append-only (no DELETE policy).
-- Domain 3 — never mix with vault or QR logic.

-- ─────────────────────────────────────────────
-- 1. collection_seals
-- ─────────────────────────────────────────────

CREATE TABLE public.collection_seals (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  seal_type     TEXT        NOT NULL
                  CHECK (seal_type IN ('brand_dna', 'finance_gate', 'production_ready')),
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'revoked')),
  approved_by   UUID,
  approved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, seal_type)
);

ALTER TABLE public.collection_seals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access collection_seals"
  ON public.collection_seals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────
-- 2. seal_audit_log (append-only)
-- ─────────────────────────────────────────────

CREATE TABLE public.seal_audit_log (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  seal_type     TEXT        NOT NULL
                  CHECK (seal_type IN ('brand_dna', 'finance_gate', 'production_ready')),
  action        TEXT        NOT NULL
                  CHECK (action IN ('approved', 'revoked')),
  actor_id      UUID,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seal_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select seal_audit_log"
  ON public.seal_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert seal_audit_log"
  ON public.seal_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- No UPDATE or DELETE policy — append-only enforced at RLS level.
