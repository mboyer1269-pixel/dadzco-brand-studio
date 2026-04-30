import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Strategic gate definitions
const GATES = [
  {
    trigger_type: "weekly_sunday",
    title: "Command Deck Review — Scoring 7 Agents",
    description: "Revue hebdomadaire : vérifier performance des 7 agents (Design, POD, Branding, Storytelling, Ads, Influencer, Cash). Scorer chaque agent et ajuster la stratégie.",
    severity: "warning",
    category: "review",
  },
  {
    trigger_type: "day_28",
    trigger_day: 28,
    title: "Gate Semaine 4 — < 12 ventes = KILL Funny line",
    description: "Si moins de 12 ventes sur la ligne Funny après 28 jours, arrêter la production et réallouer le budget vers Quiet Luxury. Gate critique cash retention.",
    severity: "critical",
    category: "gate",
  },
  {
    trigger_type: "day_45",
    trigger_day: 45,
    title: "Cash Positif Check — Pivot si non atteint",
    description: "Vérifier que le cash flow est positif à J+45. Si négatif : pivoter vers les SKUs les plus rentables, couper les ads non performants, activer le mode survie.",
    severity: "critical",
    category: "gate",
  },
  {
    trigger_type: "monthly",
    title: "Cash Retention Mensuelle — CAC vs LTV + Repeat Rate",
    description: "Analyse mensuelle : CAC doit rester < 25€, LTV/CAC ratio > 3x, repeat purchase rate > 15%. Si KPIs non atteints, revoir la stratégie acquisition.",
    severity: "warning",
    category: "cash",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const internalSecret = Deno.env.get("CHECK_GATES_INTERNAL_SECRET");
    if (!internalSecret) {
      return json({ error: "Internal secret not configured" }, 500);
    }

    const providedSecret = req.headers.get("x-internal-secret");
    if (providedSecret !== internalSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { trigger } = await req.json().catch(() => ({ trigger: "check_all" }));
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const dayOfMonth = now.getDate();
    const alerts: any[] = [];

    // Get admin user
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "No admin user found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = adminRole.user_id;

    for (const gate of GATES) {
      let shouldTrigger = false;

      if (trigger === "check_all") {
        // Check based on schedule
        if (gate.trigger_type === "weekly_sunday" && dayOfWeek === 0) shouldTrigger = true;
        if (gate.trigger_type === "monthly" && dayOfMonth === 1) shouldTrigger = true;
        if (gate.trigger_type === "day_28" || gate.trigger_type === "day_45") {
          // These are triggered relative to collection launch — check for any active collections
          shouldTrigger = true; // Will be deduplicated below
        }
      } else if (trigger === gate.trigger_type) {
        shouldTrigger = true;
      } else if (trigger === "seed") {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Deduplicate: don't create if same title exists in last 24h
        const { data: existing } = await supabase
          .from("strategic_alerts")
          .select("id")
          .eq("user_id", userId)
          .eq("title", gate.title)
          .gte("triggered_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!existing || existing.length === 0) {
          const alert = {
            user_id: userId,
            title: gate.title,
            description: gate.description,
            severity: gate.severity,
            category: gate.category,
            trigger_type: gate.trigger_type,
            trigger_day: gate.trigger_day || null,
            triggered_at: now.toISOString(),
          };
          alerts.push(alert);
        }
      }
    }

    if (alerts.length > 0) {
      const { error } = await supabase.from("strategic_alerts").insert(alerts);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ created: alerts.length, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-gates error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
