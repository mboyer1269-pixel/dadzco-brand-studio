import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Lightbulb,
  Eye,
  Factory,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Lock,
  AlertTriangle,
  Copy,
  Package,
  DollarSign,
  Zap,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BRAND_DNA } from "@/core/brand_dna";

/* ────────── Fixed MVP SKUs ────────── */

interface FounderSKU {
  name: string;
  category: string;
  audience: "parent" | "kid";
  provider: "printful" | "kin_custom";
  print_type: "DTG" | "EMBROIDERY" | "AOP";
  style: "quiet" | "funny";
  patch_option: boolean;
  cost_estimate_cad: number;
  retail_cad: number;
  margin_pct: number;
  design_prompt_primary: string;
  design_prompt_negative: string;
  mockup_brief: string;
  aop_spec: null | {
    tile_size_px: number;
    repeat_type: string;
    density_rule: string;
    panel_mapping: string[];
    seam_safety: string;
    color_limit: number;
  };
}

function enforceMargin(cost: number, retail: number) {
  const minRetail =
    cost / (1 - BRAND_DNA.financial_constraints.minimum_margin_pct / 100);
  const finalRetail = Math.max(retail, Math.ceil(minRetail));
  const margin = Math.round(((finalRetail - cost) / finalRetail) * 100);
  return { retail_cad: finalRetail, margin_pct: margin };
}

function buildFounderSKUs(idea: string): FounderSKU[] {
  const theme = idea || "Aviation & Wonders";
  const neg = BRAND_DNA.forbidden_elements.join(", ");

  const tee = enforceMargin(14, 42);
  const crew = enforceMargin(21, 59);
  const cap = enforceMargin(12, 38);
  const kid = enforceMargin(25, 62);

  return [
    {
      name: "Parent Tee",
      category: "tee",
      audience: "parent",
      provider: "printful",
      print_type: "DTG",
      style: "quiet",
      patch_option: false,
      cost_estimate_cad: 14,
      ...tee,
      mockup_brief: `Minimal ${theme} tee — centered chest graphic, aviation heritage linework, 70%+ negative space.`,
      design_prompt_primary: `Minimal premium ${theme} parent tee. Centered chest graphic, architectural linework, aviation heritage motif. 70%+ negative space. Noir profond base (#1A1A1A), ivoire details.`,
      design_prompt_negative: neg + ", text heavy, busy layout",
      aop_spec: null,
    },
    {
      name: "Parent Crewneck",
      category: "crewneck",
      audience: "parent",
      provider: "printful",
      print_type: "DTG",
      style: "quiet",
      patch_option: true,
      cost_estimate_cad: 21,
      ...crew,
      mockup_brief: `Premium ${theme} crewneck — left-chest emblem.`,
      design_prompt_primary: `Premium ${theme} crewneck. Left-chest emblem or subtle graphic.`,
      design_prompt_negative: neg,
      aop_spec: null,
    },
    {
      name: "Parent Cap",
      category: "cap",
      audience: "parent",
      provider: "printful",
      print_type: "EMBROIDERY",
      style: "quiet",
      patch_option: false,
      cost_estimate_cad: 12,
      ...cap,
      mockup_brief: `${theme} dad cap — small embroidered aviation emblem.`,
      design_prompt_primary: `${theme} dad cap. Small embroidered aviation emblem.`,
      design_prompt_negative: neg,
      aop_spec: null,
    },
    {
      name: "Kid AOP Set",
      category: "kid_aop_set",
      audience: "kid",
      provider: "kin_custom",
      print_type: "AOP",
      style: "funny",
      patch_option: false,
      cost_estimate_cad: 25,
      ...kid,
      mockup_brief: `Seamless ${theme} pattern for kid set.`,
      design_prompt_primary: `Seamless ${theme} pattern for kid set.`,
      design_prompt_negative: neg,
      aop_spec: {
        tile_size_px: 4500,
        repeat_type: "seamless",
        density_rule: "generous_negative_space",
        panel_mapping: ["front", "back"],
        seam_safety: "keep motifs away from seams",
        color_limit: 3,
      },
    },
  ];
}

/* ────────── Finance Gate ────────── */

interface FinanceVerdict {
  passed: boolean;
  avg_margin: number;
  aov_estimate: number;
  bundle_price_cad: number;
  monthly_ad_budget: number;
  max_cac: number;
  reasons: string[];
}

function computeFinanceGate(
  skus: FounderSKU[],
  adBudget: number
): FinanceVerdict {
  const reasons: string[] = [];
  const margins = skus.map((s) => s.margin_pct);
  const avg = Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
  const totalRetail = skus.reduce((a, s) => a + s.retail_cad, 0);
  const bundlePrice = Math.round(totalRetail * 0.85);
  const aov = Math.round(totalRetail / 2);

  for (const s of skus) {
    if (s.margin_pct < BRAND_DNA.financial_constraints.minimum_margin_pct) {
      reasons.push(
        `${s.name} margin ${s.margin_pct}% < ${BRAND_DNA.financial_constraints.minimum_margin_pct}%`
      );
    }
  }

  const maxCac = Math.round(
    aov * BRAND_DNA.financial_constraints.max_cac_ratio
  );

  return {
    passed: reasons.length === 0,
    avg_margin: avg,
    aov_estimate: aov,
    bundle_price_cad: bundlePrice,
    monthly_ad_budget: adBudget,
    max_cac: maxCac,
    reasons,
  };
}

/* ────────── Types ────────── */

interface FounderDropResult {
  name: string;
  theme: string;
  season: string;
  pack_type: string;
  skus: FounderSKU[];
  finance: FinanceVerdict;
}

type PipelineStep = "idea" | "previz" | "production" | "qa";

/* ────────── Main Component ────────── */

export default function Create() {
  const { toast } = useToast();

  const [idea, setIdea] = useState("");
  const [adBudget, setAdBudget] = useState(400);

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<FounderDropResult | null>(null);

  const handleGenerateFounderDrop = useCallback(async () => {
    setIsGenerating(true);

    try {
      const skus = buildFounderSKUs(idea);
      const finance = computeFinanceGate(skus, adBudget);

      const dropResult: FounderDropResult = {
        name: idea || "Founder Drop",
        theme: idea || "Aviation & Wonders",
        season: "Evergreen",
        pack_type: "founder_drop",
        skus,
        finance,
      };

      setResult(dropResult);

      toast({
        title: "Founder Drop Generated",
        description: `${skus.length} SKUs created`,
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [idea, adBudget, toast]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Founder Drop
            </h1>
          </div>

          <p className="text-sm text-muted-foreground italic">
            One idea → 4 SKUs → Prompts → Routing → Finance Gate
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <Input
              placeholder="Aviation & Wonders"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ad Budget</span>
                <span>{adBudget} CAD</span>
              </div>

              <Slider
                value={[adBudget]}
                onValueChange={(v) => setAdBudget(v[0])}
                min={300}
                max={500}
                step={25}
              />
            </div>

            <Button
              onClick={handleGenerateFounderDrop}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Generate Founder Drop Pack
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{result.name}</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-2 gap-3">
              {result.skus.map((sku, i) => (
                <div
                  key={i}
                  className="border rounded p-3 flex justify-between"
                >
                  <span>{sku.name}</span>
                  <span>{sku.margin_pct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
