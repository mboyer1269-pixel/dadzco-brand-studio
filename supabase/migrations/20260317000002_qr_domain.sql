-- Migration E: QR domain (V1)
-- Tables: qr_codes (anon-readable active only), qr_scans (append-only, no anon read).
-- Domain 5 — collection_discovery type only in V1.
-- Never mix with Domain 6 (Founder's Vault / vault_token_id).

-- ─────────────────────────────────────────────
-- 1. qr_codes
-- ─────────────────────────────────────────────

CREATE TABLE public.qr_codes (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code    TEXT        NOT NULL UNIQUE,
  qr_type       TEXT        NOT NULL DEFAULT 'collection_discovery'
                  CHECK (qr_type IN ('collection_discovery')),
                  -- V2: extend CHECK to add 'product_scan' when products table exists
  collection_id UUID        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id    UUID,
                  -- nullable V2 placeholder — no FK until products table exists
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  scan_count    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- XOR: exactly one of collection_id or product_id must be non-null.
  -- V1: collection_id NOT NULL guarantees product_id is always NULL here.
  -- V2: DROP NOT NULL on collection_id — XOR naturally handles both scan types.
  CONSTRAINT qr_codes_target_xor
    CHECK (num_nonnulls(collection_id, product_id) = 1)
);

CREATE INDEX qr_codes_collection_id_idx ON public.qr_codes (collection_id);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Anon: active codes only, no writes
CREATE POLICY "Anon read active qr_codes"
  ON public.qr_codes FOR SELECT
  TO anon
  USING (is_active = true);

-- Admin: full access
CREATE POLICY "Admin full access qr_codes"
  ON public.qr_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────
-- 2. qr_scans (append-only)
-- ─────────────────────────────────────────────

CREATE TABLE public.qr_scans (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id  UUID        NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash     TEXT,
                -- SHA-256 of client IP — never store raw IP
  user_agent  TEXT
                -- vault_token_id: out of scope until Domain 6
);

CREATE INDEX qr_scans_qr_code_id_idx ON public.qr_scans (qr_code_id);

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

-- Anon: INSERT only — no SELECT, no UPDATE, no DELETE
CREATE POLICY "Anon insert qr_scans"
  ON public.qr_scans FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admin: SELECT only — append-only enforced at RLS level (no UPDATE/DELETE policy)
CREATE POLICY "Admin select qr_scans"
  ON public.qr_scans FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────
-- 3. Trigger: increment scan_count on qr_scans insert
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.qr_codes
  SET scan_count = scan_count + 1,
      updated_at = now()
  WHERE id = NEW.qr_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_qr_scan_insert
  AFTER INSERT ON public.qr_scans
  FOR EACH ROW EXECUTE FUNCTION public.increment_qr_scan_count();
