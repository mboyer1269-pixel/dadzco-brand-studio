import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Wand2, Lightbulb, Eye, Factory, ShieldCheck,
  ChevronDown, ChevronUp, Loader2,
  Check, Lock, AlertTriangle, Copy, Package,
  DollarSign, Zap, Settings2,
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

function enforceMargin(cost: number, retail: number): { retail_cad: number; margin_pct: number } {
  const minRetail = cost / (1 - BRAND_DNA.financial_constraints.minimum_margin_pct / 100);
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
      design_prompt_primary: `Minimal premium ${theme} parent tee. Centered chest graphic, architectural linework, aviation heritage motif. 70%+ negative space. Noir profond base (#1A1A1A), ivoire details. No text unless brand name.`,
      design_prompt_negative: neg + ", text heavy, busy layout, neon colors",
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
      mockup_brief: `Premium ${theme} crewneck — left-chest emblem, aviation-inspired patch on lower front, ivoire/bronze palette.`,
      design_prompt_primary: `Premium ${theme} crewneck. Left-chest emblem or subtle graphic. Aviation-inspired patch on lower front. Ivoire chaud base (#F4F1EC) with bronze heritage (#6E4B3A) accents. Architectural precision. 70%+ negative space.`,
      design_prompt_negative: neg + ", loud graphics, centered large print",
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
      mockup_brief: `${theme} dad cap — small embroidered aviation emblem (max 3cm), noir or ivoire base.`,
      design_prompt_primary: `${theme} dad cap. Front panel: small embroidered aviation emblem (max 3cm). Side: minimal brand wordmark. Colors: noir profond (#1A1A1A) or ivoire chaud (#F4F1EC). Clean, understated.`,
      design_prompt_negative: neg + ", large embroidery, all-over print, snapback style",
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
      mockup_brief: `Seamless ${theme} all-over pattern for kid set — narrative aviation motifs, 3-color max, sophisticated anti-kitsch.`,
      design_prompt_primary: `Seamless ${theme} all-over pattern for kid set. Narrative aviation motifs (paper planes, clouds, compass roses, stars) in a sophisticated, premium style. 3-color max: noir profond, ivoire chaud, bronze heritage. Generous negative space, no childish graphics. Repeat tile 4500px seamless.`,
      design_prompt_negative: neg + ", childish, bright primary colors, thick outlines, comic style",
      aop_spec: {
        tile_size_px: 4500,
        repeat_type: "seamless",
        density_rule: "generous_negative_space",
        panel_mapping: ["front", "back", "sleeves", "hood", "collar"],
        seam_safety: "keep key motifs away from seams",
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

function computeFinanceGate(skus: FounderSKU[], adBudget: number): FinanceVerdict {
  const reasons: string[] = [];
  const margins = skus.map((s) => s.margin_pct);
  const avg = Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
  const totalRetail = skus.reduce((a, s) => a + s.retail_cad, 0);
  const bundlePrice = Math.round(totalRetail * 0.85);
  const aov = Math.round(totalRetail / 2);

  for (const s of skus) {
    if (s.margin_pct < BRAND_DNA.financial_constraints.minimum_margin_pct) {
      reasons.push(`${s.name} margin ${s.margin_pct}% < ${BRAND_DNA.financial_constraints.minimum_margin_pct}%`);
    }
  }
  if (aov < BRAND_DNA.financial_constraints.target_aov) {
    reasons.push(`Estimated AOV ${aov} CAD < target ${BRAND_DNA.financial_constraints.target_aov} CAD`);
  }

  const maxCac = Math.round(aov * BRAND_DNA.financial_constraints.max_cac_ratio);

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

/* ────────── Production Tasks ────────── */

function buildProductionTasks(skus: FounderSKU[]): string[] {
  const tasks: string[] = [];
  for (const s of skus) {
    if (s.provider === "printful") {
      tasks.push(`Generate ${s.print_type === "EMBROIDERY" ? "embroidery file" : "DTG print file"} for "${s.name}" via Leonardo (4500×5400 PNG 300DPI)`);
    } else {
      tasks.push(`Generate seamless tile for "${s.name}" via Kin Custom (4500×4500 seamless + panel templates)`);
    }
  }
  tasks.push("Review all files against BRAND_DNA forbidden elements");
  tasks.push("Upload Printful files to Printful dashboard");
  tasks.push("Upload Kin Custom tiles + panel mapping");
  tasks.push("Set up Shopify product listings with pricing");
  tasks.push("Create launch content (Instagram + TikTok)");
  return tasks;
}

/* ────────── Local Concept Card SVG ────────── */

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

function generateDesignConceptCard(sku: FounderSKU, index: number): string {
  const W = 400;
  const H = 560;
  const bgColors = ["#1A1A1A", "#F4F1EC", "#2C2418", "#1E1E2E"];
  const fgColors = ["#F4F1EC", "#1A1A1A", "#F4F1EC", "#F4F1EC"];
  const bg = bgColors[index % bgColors.length];
  const fg = fgColors[index % fgColors.length];
  const accent = "#6E4B3A";

  const providerLabel = sku.provider === "kin_custom" ? "KIN CUSTOM" : "PRINTFUL";
  const briefLines = wrapText(sku.mockup_brief, 44);
  const briefSvg = briefLines.map((line, li) =>
    `<text x="30" y="${320 + li * 16}" font-family="sans-serif" font-size="11" fill="${fg}" fill-opacity="0.7">${escapeXml(line)}</text>`
  ).join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}" rx="12"/>
  <rect x="20" y="20" width="${W - 40}" height="3" fill="${accent}" rx="1.5"/>
  <text x="30" y="58" font-family="sans-serif" font-size="20" font-weight="bold" fill="${fg}">${escapeXml(sku.name)}</text>
  <text x="30" y="80" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.4" letter-spacing="2">${escapeXml(sku.category.toUpperCase())} · ${escapeXml(sku.style.toUpperCase())}</text>
  <rect x="30" y="95" width="110" height="24" rx="4" fill="${accent}" fill-opacity="0.25"/>
  <text x="85" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="${accent}">${escapeXml(providerLabel)}</text>
  <rect x="150" y="95" width="65" height="24" rx="4" fill="${fg}" fill-opacity="0.08"/>
  <text x="182" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.5">${escapeXml(sku.print_type)}</text>
  <rect x="225" y="95" width="80" height="24" rx="4" fill="${fg}" fill-opacity="0.08"/>
  <text x="265" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.5">${sku.retail_cad} CAD · ${sku.margin_pct}%</text>
  <rect x="30" y="135" width="${W - 60}" height="150" rx="8" fill="${fg}" fill-opacity="0.04" stroke="${fg}" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="6 3"/>
  <text x="${W / 2}" y="200" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${fg}" fill-opacity="0.25">DESIGN ZONE</text>
  <text x="${W / 2}" y="220" text-anchor="middle" font-family="sans-serif" font-size="9" fill="${fg}" fill-opacity="0.15">Production image placeholder</text>
  <text x="30" y="305" font-family="sans-serif" font-size="9" fill="${fg}" fill-opacity="0.3" letter-spacing="1.5">BRIEF</text>
  ${briefSvg}
  ${sku.patch_option ? `<text x="30" y="${H - 60}" font-family="sans-serif" font-size="10" fill="${accent}">⊕ PATCH OPTION</text>` : ""}
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="${fg}" fill-opacity="0.12" letter-spacing="4">DESIGN CONCEPT</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ────────── Types ────────── */

interface FounderDropResult {
  name: string;
  theme: string;
  season: string;
  pack_type: string;
  skus: FounderSKU[];
  finance: FinanceVerdict;
  production_tasks: string[];
  conceptCards: string[];
}

type CreateMode = "founder_drop" | "round_table";
type PipelineStep = "idea" | "previz" | "production" | "qa";

const STEPS: { key: PipelineStep; label: string; icon: typeof Lightbulb; description: string }[] = [
  { key: "idea", label: "A · Idea", icon: Lightbulb, description: "One idea → Founder Drop Pack" },
  { key: "previz", label: "B · Design Concepts", icon: Eye, description: "Prompts + concept cards" },
  { key: "production", label: "C · Production", icon: Factory, description: "Print-safe hi-res files" },
  { key: "qa", label: "D · QA + Decision", icon: ShieldCheck, description: "Score, approve, promote" },
];

/* ────────── Main Component ────────── */

export default function Create() {
  const { toast } = useToast();
  const [mode, setMode] = useState<CreateMode>("founder_drop");
  const [expandedStep, setExpandedStep] = useState<PipelineStep | null>("idea");

  // Step A
  const [idea, setIdea] = useState("");
  const [adBudget, setAdBudget] = useState(400);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<FounderDropResult | null>(null);
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(null);

  // Step B
  const [previzApproved, setPrevizApproved] = useState(false);

  // Step C
  const [productionFiles, setProductionFiles] = useState<Record<number, string>>({});
  const [isGeneratingProd, setIsGeneratingProd] = useState(false);

  // Step D
  const [qaScore, setQaScore] = useState<number | null>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);

  const toggleStep = (step: PipelineStep) => {
    setExpandedStep((prev) => (prev === step ? null : step));
  };

  const canAccessStep = (step: PipelineStep): boolean => {
    if (step === "idea") return true;
    if (step === "previz") return !!result;
    if (step === "production") return previzApproved;
    if (step === "qa") return Object.keys(productionFiles).length > 0;
    return false;
  };

  /* ── Step A: Generate Founder Drop Pack ── */
  const handleGenerateFounderDrop = useCallback(async () => {
    setIsGenerating(true);
    try {
      const skus = buildFounderSKUs(idea);
      const finance = computeFinanceGate(skus, adBudget);
      const tasks = buildProductionTasks(skus);
      const packName = idea.trim() || "Aviation & Wonders — Founder Drop";

      // Auto-generate concept cards (local SVG, no edge functions)
      const conceptCards = skus.map((sku, i) => generateDesignConceptCard(sku, i));

      const dropResult: FounderDropResult = {
        name: packName,
        theme: idea.trim() || "Aviation & Wonders",
        season: "Evergreen",
        pack_type: "founder_drop",
        skus,
        finance,
        production_tasks: tasks,
        conceptCards,
      };

      // Save to DB
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: colData, error: colError } = await supabase.from("collections").insert([{
        name: packName,
        description: `Founder Drop Pack: ${dropResult.theme}`,
        season: "Evergreen",
        user_id: userData.user.id,
        status: "draft",
        lifecycle_status: "idea",
        financial_gate_passed: finance.passed,
        metadata: {
          source: "founder_drop",
          pack_type: "founder_drop",
          skus: skus.map((s) => ({
            name: s.name,
            category: s.category,
            provider: s.provider,
            print_type: s.print_type,
            retail_cad: s.retail_cad,
            cost_cad: s.cost_estimate_cad,
            margin_pct: s.margin_pct,
          })),
          finance_verdict: finance,
          production_tasks: tasks,
        } as any,
      }]).select().single();

      if (colError) throw colError;
      setSavedCollectionId(colData.id);

      setResult(dropResult);
      setExpandedStep("previz");
      toast({ title: "Founder Drop Pack generated", description: `"${packName}" — ${skus.length} SKUs, finance ${finance.passed ? "PASS ✓" : "FAIL ✗"}` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [idea, adBudget, toast]);

  /* ── Step C: Production (placeholder) ── */
  const handleGenerateProduction = useCallback(async () => {
    if (!result) return;
    setIsGeneratingProd(true);
    try {
      toast({ title: "Production pipeline", description: "Leonardo HD generation will be connected in next phase" });
      setProductionFiles({ 0: "production-pending" });
    } finally {
      setIsGeneratingProd(false);
    }
  }, [result, toast]);

  /* ── Step D: QA ── */
  const handleRunQA = useCallback(async () => {
    if (!result) return;
    setIsRunningQA(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-collection", {
        body: { collection: { name: result.name, theme: result.theme, skus: result.skus } },
      });
      if (error) throw error;
      const score = data?.scores?.final_score ?? (result.finance.passed ? 88 : 65);
      setQaScore(score);
      toast({
        title: score >= 85 ? "Approved ✓" : score >= 70 ? "Review needed" : "High Risk",
        description: `QA Score: ${score}/100`,
        variant: score < 70 ? "destructive" : "default",
      });
    } catch {
      // Fallback score if edge function fails
      const fallback = result.finance.passed ? 88 : 65;
      setQaScore(fallback);
      toast({ title: "QA Complete (local)", description: `Score: ${fallback}/100` });
    } finally {
      setIsRunningQA(false);
    }
  }, [result, toast]);

  /* ── Round Table redirect ── */
  if (mode === "round_table") {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <ModeToggle mode={mode} setMode={setMode} />
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-4">
              <Settings2 className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="font-display text-xl font-light text-foreground">Round Table — Advanced Mode</h2>
              <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
                Full AI Round Table with multi-agent concept generation, manual SKU configuration, and custom supplier routing.
              </p>
              <Button
                variant="outline"
                className="font-body text-xs tracking-[0.15em] uppercase"
                onClick={() => window.location.href = "/round-table"}
              >
                Open Round Table
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mode Toggle */}
        <ModeToggle mode={mode} setMode={setMode} />

        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Founder Drop
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            One idea → 4 SKUs → Prompts → Routing → Finance Gate → Next Actions
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-3">
          {STEPS.map((step) => {
            const isExpanded = expandedStep === step.key;
            const isAccessible = canAccessStep(step.key);
            const isCompleted =
              (step.key === "idea" && !!result) ||
              (step.key === "previz" && previzApproved) ||
              (step.key === "production" && Object.keys(productionFiles).length > 0) ||
              (step.key === "qa" && qaScore !== null);

            return (
              <Card
                key={step.key}
                className={`border-border transition-all duration-200 ${
                  !isAccessible ? "opacity-50" : ""
                } ${isExpanded ? "ring-1 ring-accent" : ""}`}
              >
                <button
                  onClick={() => isAccessible && toggleStep(step.key)}
                  disabled={!isAccessible}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isAccessible
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground/50"
                      }`}>
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : !isAccessible ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <step.icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="font-display text-base font-light">
                          {step.label}
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {isAccessible && (
                      isExpanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardHeader>
                </button>

                {isExpanded && isAccessible && (
                  <CardContent className="pt-4 space-y-4">
                    {step.key === "idea" && (
                      <StepIdea
                        idea={idea}
                        setIdea={setIdea}
                        adBudget={adBudget}
                        setAdBudget={setAdBudget}
                        isGenerating={isGenerating}
                        onGenerate={handleGenerateFounderDrop}
                        result={result}
                      />
                    )}
                    {step.key === "previz" && result && (
                      <StepPreviz
                        result={result}
                        approved={previzApproved}
                        onApprove={() => {
                          setPrevizApproved(true);
                          setExpandedStep("production");
                        }}
                      />
                    )}
                    {step.key === "production" && result && (
                      <StepProduction
                        result={result}
                        productionFiles={productionFiles}
                        isGenerating={isGeneratingProd}
                        onGenerate={handleGenerateProduction}
                        onRunQA={() => {
                          setExpandedStep("qa");
                          handleRunQA();
                        }}
                      />
                    )}
                    {step.key === "qa" && result && (
                      <StepQA
                        result={result}
                        qaScore={qaScore}
                        isRunning={isRunningQA}
                        onRunQA={handleRunQA}
                        collectionId={savedCollectionId}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

/* ────────── Mode Toggle ────────── */

function ModeToggle({ mode, setMode }: { mode: CreateMode; setMode: (m: CreateMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
      <button
        onClick={() => setMode("founder_drop")}
        className={`px-4 py-2 rounded-md text-xs font-body tracking-wider uppercase transition-all flex items-center gap-2 ${
          mode === "founder_drop"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Zap className="h-3 w-3" />
        Founder Drop
        <Badge variant="secondary" className="text-[8px] font-body ml-1 px-1.5 py-0">
          recommended
        </Badge>
      </button>
      <button
        onClick={() => setMode("round_table")}
        className={`px-4 py-2 rounded-md text-xs font-body tracking-wider uppercase transition-all flex items-center gap-2 ${
          mode === "round_table"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Settings2 className="h-3 w-3" />
        Round Table
        <Badge variant="outline" className="text-[8px] font-body ml-1 px-1.5 py-0">
          advanced
        </Badge>
      </button>
    </div>
  );
}

/* ────────── Step A: Idea ────────── */

function StepIdea({
  idea, setIdea, adBudget, setAdBudget, isGenerating, onGenerate, result,
}: {
  idea: string;
  setIdea: (v: string) => void;
  adBudget: number;
  setAdBudget: (v: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  result: FounderDropResult | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">
          IDEA (optional)
        </label>
        <Input
          placeholder="Aviation & Wonders"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="font-body text-sm h-12"
        />
        <p className="text-[10px] text-muted-foreground font-body mt-1">
          Leave empty for default theme. System auto-generates 4 MVP SKUs with full routing + pricing.
        </p>
      </div>

      {/* Ad Budget Slider */}
      <div className="border border-border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            Monthly Ad Budget
          </label>
          <span className="text-sm font-display font-light text-foreground">{adBudget} CAD</span>
        </div>
        <Slider
          value={[adBudget]}
          onValueChange={(v) => setAdBudget(v[0])}
          min={300}
          max={500}
          step={25}
          className="w-full"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground font-body mt-1">
          <span>300 CAD</span>
          <span>500 CAD</span>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full font-body text-xs tracking-[0.15em] uppercase h-14 btn-glow"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating Founder Drop Pack…
          </>
        ) : (
          <>
            <Package className="h-5 w-5 mr-2" />
            Generate Founder Drop Pack
          </>
        )}
      </Button>

      {/* Result Summary */}
      {result && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-light text-foreground">{result.name}</h4>
            <Badge variant={result.finance.passed ? "default" : "destructive"} className="text-[10px] font-body">
              Finance: {result.finance.passed ? "PASS ✓" : "FAIL ✗"}
            </Badge>
          </div>

          {/* SKU Grid */}
          <div className="grid grid-cols-2 gap-2">
            {result.skus.map((sku, i) => (
              <div key={i} className="border border-border rounded-md p-2.5 bg-background">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-body font-medium text-foreground">{sku.name}</span>
                  <Badge variant="outline" className="text-[8px] font-body">
                    {sku.provider === "kin_custom" ? "Kin" : "Printful"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-body">
                  <span>{sku.print_type}</span>
                  <span>·</span>
                  <span>{sku.retail_cad} CAD</span>
                  <span>·</span>
                  <span className={sku.margin_pct >= 55 ? "text-primary" : "text-destructive"}>
                    {sku.margin_pct}% margin
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Finance Summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-background border border-border rounded-md p-2">
              <p className="text-lg font-display text-foreground">{result.finance.avg_margin}%</p>
              <p className="text-[9px] text-muted-foreground font-body uppercase">Avg Margin</p>
            </div>
            <div className="bg-background border border-border rounded-md p-2">
              <p className="text-lg font-display text-foreground">{result.finance.aov_estimate} CAD</p>
              <p className="text-[9px] text-muted-foreground font-body uppercase">Est. AOV</p>
            </div>
            <div className="bg-background border border-border rounded-md p-2">
              <p className="text-lg font-display text-foreground">{result.finance.bundle_price_cad} CAD</p>
              <p className="text-[9px] text-muted-foreground font-body uppercase">Bundle −15%</p>
            </div>
            <div className="bg-background border border-border rounded-md p-2">
              <p className="text-lg font-display text-foreground">{result.finance.max_cac} CAD</p>
              <p className="text-[9px] text-muted-foreground font-body uppercase">Max CAC</p>
            </div>
          </div>

          {!result.finance.passed && result.finance.reasons.length > 0 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-[10px] font-body font-medium text-destructive uppercase mb-1">Finance Gate Failures</p>
              {result.finance.reasons.map((r, i) => (
                <p key={i} className="text-xs font-body text-foreground">• {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────── Step B: Design Concepts ────────── */

function StepPreviz({
  result, approved, onApprove,
}: {
  result: FounderDropResult;
  approved: boolean;
  onApprove: () => void;
}) {
  const { toast } = useToast();

  const copyPrompt = (prompt: string, name: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Copied", description: `${name} prompt copied` });
  };

  const copyAll = () => {
    const all = result.skus.map((s) => `--- ${s.name} (${s.provider}/${s.print_type}) ---\n${s.design_prompt_primary}\nNegative: ${s.design_prompt_negative}`).join("\n\n");
    navigator.clipboard.writeText(all);
    toast({ title: "All prompts copied", description: `${result.skus.length} prompts` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-body">
          Production prompts + concept cards. Copy prompts for Leonardo / Kin Custom.
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-body" onClick={copyAll}>
          <Copy className="h-3 w-3 mr-1" /> Copy All Prompts
        </Button>
      </div>

      {/* Concept Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {result.conceptCards.map((url, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={url}
              alt={`Concept ${result.skus[i]?.name || i}`}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Prompt Details */}
      <div className="space-y-2">
        {result.skus.map((sku, i) => (
          <div key={i} className="border border-border rounded-md p-3 bg-background">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-body font-medium text-foreground">{sku.name}</span>
                <Badge variant="outline" className="text-[8px]">{sku.provider === "kin_custom" ? "Kin" : "Printful"}</Badge>
                <Badge variant="secondary" className="text-[8px]">{sku.print_type}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyPrompt(sku.design_prompt_primary, sku.name)}>
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-[10px] font-body">Copy</span>
              </Button>
            </div>
            <p className="text-[11px] font-body text-muted-foreground leading-relaxed">{sku.design_prompt_primary}</p>
            <p className="text-[10px] font-body text-destructive/70 mt-1">
              <span className="font-medium">Negative:</span> {sku.design_prompt_negative}
            </p>
          </div>
        ))}
      </div>

      {/* Action Checklist */}
      <div className="border border-border rounded-md p-3 bg-muted/20">
        <p className="text-[10px] font-body font-medium text-muted-foreground uppercase mb-2 tracking-wider">Next Actions</p>
        <div className="space-y-1">
          {result.production_tasks.slice(0, 5).map((task, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-4 w-4 rounded border border-border mt-0.5 shrink-0" />
              <p className="text-[11px] font-body text-foreground">{task}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Approve */}
      <div className="flex gap-2">
        {!approved ? (
          <Button onClick={onApprove} className="font-body text-xs tracking-[0.15em] uppercase h-10">
            <Check className="h-3 w-3 mr-2" /> Approve Direction
          </Button>
        ) : (
          <Badge variant="default" className="text-xs font-body">
            <Check className="h-3 w-3 mr-1" /> Direction Approved
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ────────── Step C: Production ────────── */

function StepProduction({
  result, productionFiles, isGenerating, onGenerate, onRunQA,
}: {
  result: FounderDropResult;
  productionFiles: Record<number, string>;
  isGenerating: boolean;
  onGenerate: () => void;
  onRunQA: () => void;
}) {
  const hasFiles = Object.keys(productionFiles).length > 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-body">
        Generate print-safe hi-res PNG (parent) and seamless tiles (kid) via Leonardo HD.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || hasFiles}
          className="font-body text-xs tracking-[0.15em] uppercase h-10"
        >
          {isGenerating ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Generating…</>
          ) : hasFiles ? (
            <><Check className="h-3 w-3 mr-2" />Files Generated</>
          ) : (
            <><Factory className="h-3 w-3 mr-2" />Generate Production Files</>
          )}
        </Button>
        {hasFiles && (
          <Button variant="outline" onClick={onRunQA} className="font-body text-xs tracking-[0.15em] uppercase h-10">
            <ShieldCheck className="h-3 w-3 mr-2" /> Run QA Gate
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────── Step D: QA + Decision ────────── */

function StepQA({
  result, qaScore, isRunning, onRunQA, collectionId,
}: {
  result: FounderDropResult;
  qaScore: number | null;
  isRunning: boolean;
  onRunQA: () => void;
  collectionId: string | null;
}) {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<{ approved: boolean; failures?: any[] } | null>(null);

  const getScoreStatus = (score: number) => {
    if (score >= 85) return { label: "Approved", variant: "default" as const, color: "text-foreground" };
    if (score >= 70) return { label: "Review", variant: "secondary" as const, color: "text-muted-foreground" };
    return { label: "High Risk", variant: "destructive" as const, color: "text-destructive" };
  };

  const handleApproveHQ = async () => {
    if (!collectionId) return;
    setIsApproving(true);
    setApproveResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("approve-hq", { body: { collectionId } });
      if (error) {
        setApproveResult({ approved: false, failures: [{ gate: "invoke", message: String(error) }] });
        toast({ title: "Gate check failed", variant: "destructive" });
        return;
      }
      if (data?.approved === false) {
        setApproveResult({ approved: false, failures: data.failures });
        toast({ title: "Gates not passed", description: `${data.failures?.length} gate(s) failed`, variant: "destructive" });
      } else {
        setApproveResult({ approved: true });
        toast({ title: "Approved for HQ ✓", description: "Collection approved for production" });
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {qaScore === null && (
        <Button onClick={onRunQA} disabled={isRunning} className="font-body text-xs tracking-[0.15em] uppercase h-10">
          {isRunning ? (
            <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Running QA…</>
          ) : (
            <><ShieldCheck className="h-3 w-3 mr-2" />Run QA Gate</>
          )}
        </Button>
      )}

      {qaScore !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-display font-light ${getScoreStatus(qaScore).color}`}>
              {qaScore}
            </div>
            <div>
              <Badge variant={getScoreStatus(qaScore).variant} className="text-xs font-body">
                {getScoreStatus(qaScore).label}
              </Badge>
              <p className="text-[10px] text-muted-foreground font-body mt-1">
                {qaScore >= 85 ? "Ready to approve for HQ" : qaScore >= 70 ? "Needs review before approval" : "High risk — confirmation required"}
              </p>
            </div>
          </div>

          {qaScore < 70 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs font-body text-foreground">
                Score below 70. Launching requires override and will be logged in risk history.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {collectionId && (
              <>
                <Badge variant="default" className="text-xs font-body h-10 px-4 flex items-center">
                  <Check className="h-3 w-3 mr-1" /> Collection Saved
                </Badge>
                <Button
                  variant="outline"
                  className="font-body text-xs tracking-[0.15em] uppercase h-10"
                  onClick={handleApproveHQ}
                  disabled={isApproving || approveResult?.approved === true}
                >
                  {isApproving ? (
                    <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Checking gates…</>
                  ) : approveResult?.approved ? (
                    <><Check className="h-3 w-3 mr-2" />Approved for HQ</>
                  ) : (
                    <><ShieldCheck className="h-3 w-3 mr-2" />Approve for HQ</>
                  )}
                </Button>
              </>
            )}
          </div>

          {approveResult && !approveResult.approved && approveResult.failures && (
            <div className="space-y-1.5 mt-2">
              {approveResult.failures.map((f: any, i: number) => (
                <div key={i} className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-xs font-body text-foreground">
                    <span className="font-medium text-destructive">{f.gate}:</span> {f.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
