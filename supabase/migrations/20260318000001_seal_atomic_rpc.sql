-- Migration E: Atomic seal action RPC
-- Wraps collection_seals upsert + seal_audit_log insert in one transaction.
-- The Edge Function manage-seal calls this instead of doing two separate writes.
-- V1 revoke rule preserved: only seal status is changed, lifecycle_status is never touched.

CREATE OR REPLACE FUNCTION public.apply_seal_action(
  p_collection_id uuid,
  p_seal_type     text,
  p_new_status    text,   -- 'approved' | 'revoked'
  p_actor_id      uuid,
  p_reason        text DEFAULT NULL
)
RETURNS SETOF public.collection_seals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs inside the DB so invalid data never reaches either table.
  IF p_new_status NOT IN ('approved', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be approved or revoked.', p_new_status;
  END IF;

  IF p_seal_type NOT IN ('brand_dna', 'finance_gate', 'production_ready') THEN
    RAISE EXCEPTION 'Invalid seal_type: %.', p_seal_type;
  END IF;

  -- 1. Audit log first. If this INSERT fails the whole transaction rolls back
  --    and collection_seals is never touched.
  INSERT INTO public.seal_audit_log (collection_id, seal_type, action, actor_id, reason)
  VALUES (p_collection_id, p_seal_type, p_new_status, p_actor_id, p_reason);

  -- 2. Upsert the seal. If this fails the audit INSERT above also rolls back.
  RETURN QUERY
  INSERT INTO public.collection_seals (
    collection_id, seal_type, status, approved_by, approved_at
  )
  VALUES (
    p_collection_id, p_seal_type, p_new_status, p_actor_id, now()
  )
  ON CONFLICT (collection_id, seal_type) DO UPDATE
    SET status      = EXCLUDED.status,
        approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at
  RETURNING *;
END;
$$;

-- Edge Function uses the service_role key; grant execute explicitly.
GRANT EXECUTE ON FUNCTION public.apply_seal_action TO service_role;
