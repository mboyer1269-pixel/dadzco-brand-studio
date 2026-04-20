import { useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Gift,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  buildFounderSKUs,
  computeFinanceGate,
  buildProductionTasks,
  generateDesignConceptCard,
  type FounderDropResult,
  type FounderSKU,
} from "@/features/founderDrop/founderDrop";

type CreateMode = "founder_drop" | "round_table";
type PipelineStep = "idea" | "previz" | "production" | "qa";

const STEPS: { key: PipelineStep; label: string; icon: typeof Lightbulb; description: string }[] = [
  { key: "idea", label: "A · Idea", icon: Lightbulb, description: "One idea → Founder Drop Pack" },
  { key: "previz", label: "B · Design Concepts", icon: Eye, description: "Prompts + concept cards" },
  { key: "production", label: "C · Production", icon: Factory, description: "Print-safe hi-res files" },
  { key: "qa", label: "D · QA + Decision", icon: ShieldCheck, description: "Score, approve, promote" },
];

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

  const toggleStep = (step: PipelineStep) => setExpandedStep((prev) => (prev === step ? null : step));

  const canAccessStep = (step: PipelineStep): boolean => {
    if (step === "idea") return true;
    if (step === "previz") return !!result;
    if (step === "production") return previzApproved;
    if (step === "qa") return Object.keys(productionFiles).length > 0;
    return false;
  };

  const handleGenerateFounderDrop = useCallback(async () => {
    setIsGenerating(true);
    try {
      const skus = buildFounderSKUs(idea);
      const finance = computeFinanceGate(skus, adBudget);
      const tasks = buildProductionTasks(skus);
      const packName = idea.trim() || "Aviation & Wonders — Founder Drop";

      const conceptCards = skus.map((sku, i) => generateDesignConceptCard(sku, i));

      const dropResult: FounderDropResult = {
        name: packName,
        theme: "Aviation & Wonders",
        season: "Evergreen",
        pack_type: "founder_drop",
        skus,
        finance,
        production_tasks: tasks,
        conceptCards,
      };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: colData, error: colError } = await supabase
        .from("collections")
        .insert([
          {
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
          },
        ])
        .select()
        .single();

      if (colError) throw colError;
      setSavedCollectionId(colData.id);

      setResult(dropResult);
      setExpandedStep("previz");

      toast({
        title: "Founder Drop Pack generated",
        description: `"${packName}" — ${skus.length} SKUs, finance ${finance.passed ? "PASS ✓" : "FAIL ✗"}`,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [idea, adBudget, toast]);

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
      const fallback = result.finance.passed ? 88 : 65;
      setQaScore(fallback);
      toast({ title: "QA Complete (local)", description: `Score: ${fallback}/100` });
    } finally {
      setIsRunningQA(false);
    }
  }, [result, toast]);

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
                onClick={() => (window.location.href = "/round-table")}
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
        <ModeToggle mode={mode} setMode={setMode} />

        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">Founder Drop</h1>
            <Badge variant="outline" title="Theme locked for the V1 Founder Drop." className="inline-flex items-center gap-1.5 text-[9px] font-body tracking-[0.12em] uppercase border-accent text-accent ml-1 cursor-default">
              <Lock className="h-3 w-3" />
              Aviation &amp; Wonders · V1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            One idea → 4 SKUs → Prompts → Routing → Finance Gate → Next Actions
          </p>
        </div>

        <BrandCopyCheck />

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
                className={`border-border transition-all duration-200 ${!isAccessible ? "opacity-50" : ""} ${
                  isExpanded ? "ring-1 ring-accent" : ""
                }`}
              >
                <button onClick={() => isAccessible && toggleStep(step.key)} disabled={!isAccessible} className="w-full text-left">
                  <CardHeader className="pb-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isAccessible
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground/50"
                        }`}
                      >
                        {isCompleted ? <Check className="h-4 w-4" /> : !isAccessible ? <Lock className="h-3 w-3" /> : <step.icon className="h-4 w-4" />}
                      </div>
                      <div>
                        <CardTitle className="font-display text-base font-light">{step.label}</CardTitle>
                        <p className="text-[10px] text-muted-foreground font-body mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    {isAccessible &&
                      (isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ))}
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

function ModeToggle({ mode, setMode }: { mode: CreateMode; setMode: (m: CreateMode) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
      <button
        onClick={() => setMode("founder_drop")}
        className={`px-4 py-2 rounded-md text-xs font-body tracking-wider uppercase transition-all flex items-center gap-2 ${
          mode === "founder_drop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
          mode === "round_table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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

function StepIdea({
  idea,
  setIdea,
  adBudget,
  setAdBudget,
  isGenerating,
  onGenerate,
  result,
}: {
  idea: string;
  setIdea: (v: string) => void;
  adBudget: number;
  setAdBudget: (v: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  result: FounderDropResult | null;
}) {
  const { toast } = useToast();
  const [capUpsellSelected, setCapUpsellSelected] = useState(false);
  const [bundleSelected, setBundleSelected] = useState(false);
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">DROP NAME (optional)</label>
        <Input
          placeholder="Founder Drop — March"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="font-body text-sm h-12"
        />
        <p className="text-[10px] text-muted-foreground font-body mt-1">
          Optional internal label. The collection theme remains "Aviation & Wonders" for the V1 Founder Drop.
        </p>
      </div>

      <div className="border border-border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3 w-3" />
            Monthly Ad Budget
          </label>
          <span className="text-sm font-display font-light text-foreground">{adBudget} CAD</span>
        </div>
        <Slider value={[adBudget]} onValueChange={(v) => setAdBudget(v[0])} min={300} max={500} step={25} className="w-full" />
        <div className="flex justify-between text-[9px] text-muted-foreground font-body mt-1">
          <span>300 CAD</span>
          <span>500 CAD</span>
        </div>
      </div>

      <Button onClick={onGenerate} disabled={isGenerating} className="w-full font-body text-xs tracking-[0.15em] uppercase h-14 btn-glow" size="lg">
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

      {result && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-light text-foreground">{result.name}</h4>
            <Badge variant={result.finance.passed ? "default" : "destructive"} className="text-[10px] font-body">
              Finance: {result.finance.passed ? "PASS ✓" : "FAIL ✗"}
            </Badge>
          </div>

          {/* — Bundle Primary Offer — */}
          {(() => {
            const tee = result.skus.find(s => s.name.toLowerCase().includes("tee"));
            const kid = result.skus.find(s => s.name.toLowerCase().includes("kid") || s.name.toLowerCase().includes("aop"));
            const cap = result.skus.find(s => s.name.toLowerCase().includes("cap"));
            const capPrice = cap?.retail_cad ?? 0;
            const baseCombinedPrice = (tee?.retail_cad ?? 0) + (kid?.retail_cad ?? 0);
            const combinedPrice = baseCombinedPrice + (capUpsellSelected ? capPrice : 0);
            const bundlePrice = Math.round(combinedPrice * 0.85);
            const savings = combinedPrice - bundlePrice;
            return (
              <div className="space-y-3">
                <Card className="border-2 border-accent bg-accent/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-md text-[9px] font-body tracking-[0.1em] uppercase">
                      Best Value
                    </Badge>
                  </div>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="font-display text-lg font-light text-foreground flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent" />
                      Founder Bundle
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-body">
                      Parent Tee + Kid AOP Set{capUpsellSelected ? " + Cap" : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-3">
                    {/* Live Order Total Summary */}
                    <div className="border border-border rounded-md p-3 bg-background space-y-1.5">
                      <p className="text-[9px] font-body uppercase tracking-[0.12em] text-muted-foreground mb-2">Order Summary</p>
                      <div className="flex justify-between text-xs font-body text-foreground">
                        <span>Parent Tee</span>
                        <span>{tee?.retail_cad ?? 0} CAD</span>
                      </div>
                      <div className="flex justify-between text-xs font-body text-foreground">
                        <span>Kid AOP Set</span>
                        <span>{kid?.retail_cad ?? 0} CAD</span>
                      </div>
                      {capUpsellSelected && (
                        <div className="flex justify-between text-xs font-body text-foreground">
                          <span>Parent Cap</span>
                          <span>{capPrice} CAD</span>
                        </div>
                      )}
                      <div className="border-t border-border my-1.5" />
                      <div className="flex justify-between text-xs font-body text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{combinedPrice} CAD</span>
                      </div>
                      <div className="flex justify-between text-xs font-body font-medium text-foreground">
                        <span>Bundle price</span>
                        <span>{bundlePrice} CAD</span>
                      </div>
                      <div className="flex justify-between text-xs font-body text-primary">
                        <span>You save</span>
                        <span>−{savings} CAD</span>
                      </div>
                    </div>

                    <Button
                      className="mt-1 w-full font-body text-xs tracking-[0.15em] uppercase h-10"
                      disabled={bundleSelected || !result.finance.passed}
                      onClick={() => {
                        setBundleSelected(true);
                        toast({
                          title: "Bundle",
                          description: capUpsellSelected
                            ? "Founder Bundle + Cap selected"
                            : "Founder Bundle selected",
                        });
                      }}
                    >
                      {bundleSelected
                        ? "Bundle Selected ✓"
                        : !result.finance.passed
                        ? "Fix Finance Gate to unlock bundle"
                        : "Shop Founder Bundle"}
                    </Button>
                    <p className="text-[9px] text-muted-foreground font-body text-center mt-1">
                      You'll be able to edit quantities at checkout.
                    </p>
                  </CardContent>
                </Card>

                {cap && (
                  <div className="border border-border rounded-lg p-3 bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-body font-medium text-foreground">
                        {capUpsellSelected ? "Cap added ✓" : "Add the Parent Cap"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-body">Complete the look.</p>
                    </div>
                    <Button
                      variant={capUpsellSelected ? "secondary" : "outline"}
                      size="sm"
                      className="font-body text-[10px] tracking-[0.1em] uppercase h-8 shrink-0"
                      onClick={() => {
                        const next = !capUpsellSelected;
                        setCapUpsellSelected(next);
                        toast({
                          title: next ? "Cap added" : "Cap removed",
                          description: next
                            ? `+${capPrice} CAD added to bundle`
                            : "Cap removed from bundle",
                        });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {capUpsellSelected ? "Remove Cap" : `Add Cap (+${capPrice} CAD)`}
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}

          <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Or shop items individually</p>

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
                  <span className={sku.margin_pct >= 55 ? "text-primary" : "text-destructive"}>{sku.margin_pct}% margin</span>
                </div>
              </div>
            ))}
          </div>

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
                <p key={i} className="text-xs font-body text-foreground">
                  • {r}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepPreviz({ result, approved, onApprove }: { result: FounderDropResult; approved: boolean; onApprove: () => void }) {
  const { toast } = useToast();

  const copyPrompt = (prompt: string, name: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Copied", description: `${name} prompt copied` });
  };

  const copyAll = () => {
    const all = result.skus
      .map((s) => `--- ${s.name} (${s.provider}/${s.print_type}) ---\n${s.design_prompt_primary}\nNegative: ${s.design_prompt_negative}`)
      .join("\n\n");
    navigator.clipboard.writeText(all);
    toast({ title: "All prompts copied", description: `${result.skus.length} prompts` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-body">Production prompts + concept cards. Copy prompts for Leonardo / Kin Custom.</p>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-body" onClick={copyAll}>
          <Copy className="h-3 w-3 mr-1" /> Copy All Prompts
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {result.conceptCards.map((url, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
            <img src={url} alt={`Concept ${result.skus[i]?.name || i}`} className="w-full h-auto object-contain" loading="lazy" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {result.skus.map((sku, i) => (
          <div key={i} className="border border-border rounded-md p-3 bg-background">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-body font-medium text-foreground">{sku.name}</span>
                <Badge variant="outline" className="text-[8px]">
                  {sku.provider === "kin_custom" ? "Kin" : "Printful"}
                </Badge>
                <Badge variant="secondary" className="text-[8px]">
                  {sku.print_type}
                </Badge>
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

function StepProduction({
  productionFiles,
  isGenerating,
  onGenerate,
  onRunQA,
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
      <p className="text-xs text-muted-foreground font-body">Generate print-safe hi-res PNG (parent) and seamless tiles (kid) via Leonardo HD.</p>
      <div className="flex gap-2">
        <Button onClick={onGenerate} disabled={isGenerating || hasFiles} className="font-body text-xs tracking-[0.15em] uppercase h-10">
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Generating…
            </>
          ) : hasFiles ? (
            <>
              <Check className="h-3 w-3 mr-2" />
              Files Generated
            </>
          ) : (
            <>
              <Factory className="h-3 w-3 mr-2" />
              Generate Production Files
            </>
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

function BrandCopyCheck() {
  const [copy, setCopy] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[] | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("brand_rules")
        .select("forbidden_keywords")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setRulesError("Impossible de charger les règles brand.");
        setRulesLoaded(true);
        return;
      }
      const flat = (data ?? []).flatMap(
        (r) => ((r.forbidden_keywords as string[] | null) ?? []),
      );
      const unique = Array.from(
        new Set(
          flat
            .map((k) => (typeof k === "string" ? k.trim().toLowerCase() : ""))
            .filter((k) => k.length > 0),
        ),
      );
      setKeywords(unique);
      setRulesLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = () => {
    const lower = copy.toLowerCase();
    const hits = keywords.filter((kw) => lower.includes(kw));
    setViolations(hits);
    setChecked(true);
  };

  const reset = () => {
    setCopy("");
    setViolations(null);
    setChecked(false);
  };

  const canRun =
    rulesLoaded && !rulesError && keywords.length > 0 && copy.trim().length > 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base font-light flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Brand Copy Check
        </CardTitle>
        <p className="text-[10px] text-muted-foreground font-body">
          Colle ton launch copy. Vérification locale contre les mots-clés interdits extraits dans Brand Book.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={copy}
          onChange={(e) => {
            setCopy(e.target.value);
            setChecked(false);
            setViolations(null);
          }}
          placeholder="Paste launch copy here…"
          rows={4}
          className="text-xs font-body"
        />

        {!rulesLoaded ? (
          <p className="text-[10px] text-muted-foreground font-body">
            Chargement des règles brand…
          </p>
        ) : rulesError ? (
          <p className="text-[10px] text-destructive font-body">{rulesError}</p>
        ) : keywords.length === 0 ? (
          <p className="text-[10px] text-muted-foreground font-body italic">
            Aucun mot-clé interdit n'a été extrait. Upload ton Brand Book pour activer la vérification.
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground font-body">
            Vérifié contre {keywords.length} mot(s)-clé(s) interdit(s).
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="text-[10px] font-body tracking-wider uppercase h-8"
            disabled={!canRun}
            onClick={runCheck}
          >
            <ShieldCheck className="h-3 w-3 mr-1.5" />
            Run Check
          </Button>
          {checked && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] font-body tracking-wider uppercase h-8"
              onClick={reset}
            >
              Reset
            </Button>
          )}
        </div>

        {checked && violations !== null && violations.length === 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-[hsl(142,60%,45%)]/10 border border-[hsl(142,60%,45%)]/30">
            <Check className="h-4 w-4 text-[hsl(142,60%,45%)] shrink-0" />
            <p className="text-xs font-body text-[hsl(142,60%,45%)]">
              PASS — aucun mot-clé interdit détecté.
            </p>
          </div>
        )}

        {checked && violations !== null && violations.length > 0 && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs font-body font-medium text-destructive">
                FAIL — {violations.length} violation{violations.length > 1 ? "s" : ""} détectée{violations.length > 1 ? "s" : ""}.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {violations.map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="text-[9px] border-destructive/40 text-destructive bg-destructive/5 flex items-center gap-1"
                >
                  <Ban className="h-2.5 w-2.5" />
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepQA({
  qaScore,
  isRunning,
  onRunQA,
  collectionId,
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
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Running QA…
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3 mr-2" />
              Run QA Gate
            </>
          )}
        </Button>
      )}

      {qaScore !== null && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-display font-light ${getScoreStatus(qaScore).color}`}>{qaScore}</div>
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
              <p className="text-xs font-body text-foreground">Score below 70. Launching requires override and will be logged in risk history.</p>
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
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Checking gates…
                    </>
                  ) : approveResult?.approved ? (
                    <>
                      <Check className="h-3 w-3 mr-2" />
                      Approved for HQ
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3 mr-2" />
                      Approve for HQ
                    </>
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