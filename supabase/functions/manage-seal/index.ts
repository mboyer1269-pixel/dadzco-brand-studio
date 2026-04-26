import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_SEAL_TYPES = ["brand_dna", "finance_gate", "production_ready"];
const VALID_ACTIONS = ["approve", "revoke"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── 1. Verify JWT ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // ── 2. Service-role client for all DB writes ───────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── 3. Admin role check ────────────────────────────────────────────
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    // ── 4. Parse and validate request body ────────────────────────────
    const { collection_id, seal_type, action, reason } = await req.json();

    if (!collection_id) {
      return json({ error: "Missing collection_id" }, 400);
    }
    if (!VALID_SEAL_TYPES.includes(seal_type)) {
      return json(
        { error: `Invalid seal_type. Must be one of: ${VALID_SEAL_TYPES.join(", ")}` },
        400
      );
    }
    if (!VALID_ACTIONS.includes(action)) {
      return json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        400
      );
    }

    // ── 5. Verify collection exists ────────────────────────────────────
    const { data: col } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collection_id)
      .maybeSingle();

    if (!col) {
      return json({ error: "Collection not found" }, 404);
    }

    // ── 6. Atomic RPC — both writes in one Postgres transaction ───────
    // apply_seal_action inserts seal_audit_log then upserts collection_seals.
    // If either statement fails Postgres rolls back both — no partial state.
    // V1 revoke rule: function never touches lifecycle_status.
    const newStatus = action === "approve" ? "approved" : "revoked";

    const { data: sealRows, error: rpcErr } = await supabase.rpc(
      "apply_seal_action",
      {
        p_collection_id: collection_id,
        p_seal_type:     seal_type,
        p_new_status:    newStatus,
        p_actor_id:      userId,
        p_reason:        reason ?? null,
      }
    );

    if (rpcErr) {
      throw new Error(`Seal action failed: ${rpcErr.message}`);
    }

    const seal = (sealRows as unknown[])?.[0] ?? null;
    return json({ success: true, seal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
