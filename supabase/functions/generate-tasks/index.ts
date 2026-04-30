import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const adminUserId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    const { collectionName, collectionType, skuCount, season, startDate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es l'AI Task Agent de DADZCO Brand OS, expert en lancement de collections POD (Print-on-Demand) via Printful + Shopify.

Tu génères un plan de lancement complet sur 90 jours avec des tâches concrètes, datées, classées par catégorie et priorité.

Catégories disponibles : design, printful, shopify, ads, influencer, cash, content.
Priorités : high, medium, low.

Pour chaque tâche, indique :
- title : description claire et actionnable (en français)
- date : date ISO (YYYY-MM-DD), répartie intelligemment sur 90 jours
- priority : high/medium/low
- category : une des catégories ci-dessus
- cashAlert : true si c'est un gate financier critique (vérification CAC, marges, budget ads)

Règles cash retention :
- Inclure des gates "vérifier CAC < 25€" et "valider marges > 55%" à des moments clés
- Alerter sur les dépenses ads avant validation des métriques
- Inclure des tâches repeat purchase post-drop

Génère entre 12 et 20 tâches bien réparties.`;

    const userPrompt = `Collection : "${collectionName || "Nouvelle Collection"}" 
Type : ${collectionType || "mixed (Quiet Luxury + Funny Dad)"}
Nombre de SKUs : ${skuCount || 4}
Saison : ${season || "Printemps 2026"}
Date de début : ${startDate || new Date().toISOString().split("T")[0]}

Génère le plan de lancement complet.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_tasks",
              description: "Return the generated launch tasks",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        date: { type: "string", description: "ISO date YYYY-MM-DD" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        category: { type: "string", enum: ["design", "printful", "shopify", "ads", "influencer", "cash", "content"] },
                        cashAlert: { type: "boolean" },
                      },
                      required: ["title", "date", "priority", "category"],
                    },
                  },
                },
                required: ["tasks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_tasks" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let tasks: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      tasks = parsed.tasks.map((t: any, i: number) => ({
        id: crypto.randomUUID(),
        title: t.title,
        date: t.date,
        priority: t.priority || "medium",
        category: t.category || "content",
        status: "todo",
        cashAlert: t.cashAlert || false,
      }));
    }

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
