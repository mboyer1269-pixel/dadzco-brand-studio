-- Migration F: Tighten anon INSERT policy on qr_scans
-- Replaces WITH CHECK (true) with a check that verifies
-- the referenced qr_code exists and is active.
-- Prevents anon inserts against inactive or non-existent QR codes.

DROP POLICY IF EXISTS "Anon insert qr_scans" ON public.qr_scans;

CREATE POLICY "Anon insert qr_scans"
  ON public.qr_scans
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.qr_codes
      WHERE id = qr_code_id
        AND is_active = true
    )
  );
