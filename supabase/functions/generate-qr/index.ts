import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ── 2. Service-role client for all DB operations ───────────────────
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
    const { collection_id, target_url } = await req.json();

    if (!collection_id) {
      return json({ error: "Missing collection_id" }, 400);
    }
    if (!target_url || typeof target_url !== "string") {
      return json({ error: "Missing target_url" }, 400);
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

    // ── 6. Return existing active QR if one already exists ─────────────
    // V1: one collection_link QR per collection — idempotent.
    const { data: existing } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("collection_id", collection_id)
      .eq("qr_type", "collection_link")
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return json({ qr_code: existing });
    }

    // ── 7. Generate short_code and insert new row ──────────────────────
    const short_code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

    const { data: inserted, error: insertErr } = await supabase
      .from("qr_codes")
      .insert({
        collection_id,
        short_code,
        qr_type: "collection_link",
        is_active: true,
        scan_count: 0,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message ?? "Insert failed");
    }

    return json({ qr_code: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
