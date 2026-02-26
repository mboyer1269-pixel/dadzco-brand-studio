import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LEONARDO_API_KEY = Deno.env.get("LEONARDO_API_KEY");
    if (!LEONARDO_API_KEY) throw new Error("LEONARDO_API_KEY is not configured");

    const res = await fetch("https://cloud.leonardo.ai/api/rest/v1/me", {
      headers: {
        Authorization: `Bearer ${LEONARDO_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("Leonardo /me error:", res.status, t);
      throw new Error(`Leonardo API error: ${res.status}`);
    }

    const data = await res.json();
    const userInfo = data.user_details?.[0] || {};

    return new Response(
      JSON.stringify({
        apiConcurrencySlots: userInfo.apiConcurrencySlots ?? 0,
        apiPaidTokens: userInfo.apiPaidTokens ?? 0,
        apiSubscriptionTokens: userInfo.apiSubscriptionTokens ?? 0,
        apiPlanTokenRenewalDate: userInfo.apiPlanTokenRenewalDate ?? null,
        tokenRenewalDate: userInfo.tokenRenewalDate ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Leonardo credits error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
