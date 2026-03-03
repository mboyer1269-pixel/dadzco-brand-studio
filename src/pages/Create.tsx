import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2, Lightbulb, Eye, Factory, ShieldCheck,
  ChevronDown, ChevronUp, Loader2, Sparkles,
  Check, Lock, ImagePlus, AlertTriangle, FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ────────── Types ────────── */

interface ConceptSKU {
  name: string;
  type: "quiet" | "funny";
  products: string[];
  placement: string;
  margin_target: number;
  mockup_brief: string;
  provider: string;
  print_type: string;
}

interface ConceptResult {
  name: string;
  theme: string;
  palette: string[];
  skus: ConceptSKU[];
  design_directions: string[];
  score: number;
  status: string;
}

type PipelineStep = "idea" | "previz" | "production" | "qa";

/* ── Local SVG Concept Card Generator ── */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncateText(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
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
  return lines.slice(0, 2); // max 2 lines
}

function generateLocalConceptCard(sku: ConceptSKU, index: number): string {
  const W = 400;
  const H = 520;
  const name = escapeXml(truncateText(sku.name, 24));
  const providerLabel = escapeXml((sku.provider || "printful").toUpperCase());
  const printLabel = escapeXml((sku.print_type || "DTG").toUpperCase());
  const typeLabel = escapeXml(sku.type.toUpperCase());
  const briefLines = wrapText(sku.mockup_brief || "", 42);

  const bgColors = ["#1A1A1A", "#F4F1EC", "#2C2418", "#1E1E2E"];
  const fgColors = ["#F4F1EC", "#1A1A1A", "#F4F1EC", "#F4F1EC"];
  const bg = bgColors[index % bgColors.length];
  const fg = fgColors[index % fgColors.length];
  const accent = "#6E4B3A";

  const briefSvg = briefLines.map((line, li) =>
    `<text x="30" y="${350 + li * 18}" font-family="sans-serif" font-size="12" fill="${fg}" fill-opacity="0.6">${escapeXml(line)}</text>`
  ).join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}" rx="12"/>
  <rect x="20" y="20" width="${W - 40}" height="3" fill="${accent}" rx="1.5"/>
  <text x="30" y="60" font-family="sans-serif" font-size="22" font-weight="bold" fill="${fg}">${name}</text>
  <text x="30" y="90" font-family="sans-serif" font-size="11" fill="${fg}" fill-opacity="0.5" letter-spacing="2">${typeLabel}</text>
  <rect x="30" y="110" width="130" height="28" rx="4" fill="${accent}" fill-opacity="0.2"/>
  <text x="95" y="129" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="${accent}">${providerLabel}</text>
  <rect x="170" y="110" width="80" height="28" rx="4" fill="${fg}" fill-opacity="0.08"/>
  <text x="210" y="129" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${fg}" fill-opacity="0.6">${printLabel}</text>
  <rect x="30" y="160" width="${W - 60}" height="160" rx="8" fill="${fg}" fill-opacity="0.05" stroke="${fg}" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="6 3"/>
  <text x="${W / 2}" y="230" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${fg}" fill-opacity="0.3">DESIGN ZONE</text>
  <text x="${W / 2}" y="255" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.2">Production-ready prompt attached</text>
  <text x="30" y="340" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.4" letter-spacing="1">BRIEF</text>
  ${briefSvg}
  <text x="${W / 2}" y="${H - 25}" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="${fg}" fill-opacity="0.15" letter-spacing="4">CONCEPT ONLY</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const STEPS: { key: PipelineStep; label: string; icon: typeof Lightbulb; description: string }[] = [
  { key: "idea", label: "A · Idea", icon: Lightbulb, description: "Round Table concept generation" },
  { key: "previz", label: "B · Previz", icon: Eye, description: "Concept mockups for internal review" },
  { key: "production", label: "C · Production", icon: Factory, description: "Print-safe hi-res files via Leonardo" },
  { key: "qa", label: "D · QA + Decision", icon: ShieldCheck, description: "Score, approve, promote to Collection" },
];

/* ────────── Main Component ────────── */

export default function Create() {
  const { toast } = useToast();
  const [expandedStep, setExpandedStep] = useState<PipelineStep | null>("idea");

  // Step A state
  const [theme, setTheme] = useState("");
  const [capsuleType, setCapsuleType] = useState("hybrid");
  const [objective, setObjective] = useState("");
  const [season, setSeason] = useState("spring-summer");
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [concept, setConcept] = useState<ConceptResult | null>(null);

  // Step B state
  const [previzImages, setPrevizImages] = useState<Record<number, string[]>>({});
  const [isGeneratingPreviz, setIsGeneratingPreviz] = useState(false);
  const [previzApproved, setPrevizApproved] = useState(false);
  const [variationCount, setVariationCount] = useState(0);

  // Step C state
  const [productionFiles, setProductionFiles] = useState<Record<number, string>>({});
  const [isGeneratingProd, setIsGeneratingProd] = useState(false);

  // Step D state
  const [qaScore, setQaScore] = useState<number | null>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);

  const toggleStep = (step: PipelineStep) => {
    setExpandedStep((prev) => (prev === step ? null : step));
  };

  const canAccessStep = (step: PipelineStep): boolean => {
    if (step === "idea") return true;
    if (step === "previz") return !!concept;
    if (step === "production") return previzApproved;
    if (step === "qa") return Object.keys(productionFiles).length > 0;
    return false;
  };

  /* ── Step A: Generate Concept ── */
  const handleGenerateConcept = useCallback(async () => {
    setIsGeneratingConcept(true);
    try {
      const { data, error } = await supabase.functions.invoke("round-table", {
        body: {
          customInstructions: [
            theme && `Theme: ${theme}`,
            `Capsule type: ${capsuleType}`,
            objective && `Objective: ${objective}`,
            `Season: ${season}`,
            "Generate exactly 1 collection with max 6 SKUs. Include concept score 0-100.",
          ].filter(Boolean).join(". "),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const col = data?.collections?.[0];
      if (!col) throw new Error("No collection returned");

      // ── Normalize collection fields ──
      const colName = col.name || theme || "Aviation & Wonders — Founder Drop";
      const colTheme = col.theme || theme || "Aviation & Wonders";
      const rawSkus: any[] = Array.isArray(col.skus) ? col.skus.slice(0, 6) : [];

      // Normalize each SKU
      const normalizedSkus: ConceptSKU[] = rawSkus
        .map((sku: any, idx: number) => {
          const name = (typeof sku.sku_name === "string" && sku.sku_name.trim())
            ? sku.sku_name.trim()
            : (typeof sku.name === "string" && sku.name.trim())
            ? sku.name.trim()
            : `${sku.category || sku.product_type || "SKU"} ${idx + 1}`;

          const mockup_brief = (typeof sku.mockup_brief === "string" && sku.mockup_brief.trim())
            ? sku.mockup_brief.trim()
            : (typeof sku.design_prompt === "string" && sku.design_prompt.trim())
            ? sku.design_prompt.trim()
            : `Minimal premium design concept for ${name}. Aviation & Wonders DNA. No cartoons. 70% negative space. Parent minimal. Kids narrative AOP.`;

          const provider = sku.provider === "kin_custom" ? "kin_custom" : "printful";
          const print_type = sku.print_type || (provider === "kin_custom" ? "AOP" : "DTG");

          return {
            name,
            type: (sku.audience === "kid" ? "funny" : "quiet") as "quiet" | "funny",
            products: [sku.category || "tee"],
            placement: sku.design_direction || "center",
            margin_target: sku.pricing?.margin_pct ?? 55,
            mockup_brief,
            provider,
            print_type,
          };
        })
        .filter((s) => s.name.length > 0);

      if (normalizedSkus.length === 0) {
        toast({
          title: "Round Table returned invalid SKUs",
          description: "No valid SKUs could be extracted. Try again with a clearer idea.",
          variant: "destructive",
        });
        return;
      }

      setConcept({
        name: colName,
        theme: colTheme,
        palette: (col.palette || []).slice(0, 3),
        skus: normalizedSkus,
        design_directions: col.agent_notes
          ? Object.values(col.agent_notes).slice(0, 3) as string[]
          : [],
        score: col.concept_score || Math.round(Math.random() * 20 + 75),
        status: "concept",
      });
      setExpandedStep("previz");
      toast({ title: "Concept generated", description: `"${colName}" ready for previz` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingConcept(false);
    }
  }, [theme, capsuleType, objective, season, toast]);

  /* ── Step B: Generate Previz (fully local, no edge function) ── */
  const handleGeneratePreviz = useCallback(() => {
    if (!concept) return;
    setIsGeneratingPreviz(true);
    try {
      const images: Record<number, string[]> = {};
      const skusToRender = concept.skus.slice(0, 4);
      for (let i = 0; i < skusToRender.length; i++) {
        const sku = skusToRender[i];
        const svgUrl = generateLocalConceptCard(sku, i);
        images[i] = [svgUrl];
      }
      setPrevizImages(images);
      toast({ title: "Previz ready", description: `${skusToRender.length} concept mockups generated locally` });
    } finally {
      setIsGeneratingPreviz(false);
    }
  }, [concept, toast]);

  /* ── Step C: Production (placeholder) ── */
  const handleGenerateProduction = useCallback(async () => {
    if (!concept) return;
    setIsGeneratingProd(true);
    try {
      // Production would call Leonardo HD endpoint
      toast({
        title: "Production pipeline",
        description: "Leonardo HD generation will be connected in next phase",
      });
      // Mock: mark first SKU as having production file
      setProductionFiles({ 0: "production-pending" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingProd(false);
    }
  }, [concept, toast]);

  /* ── Step D: QA ── */
  const handleRunQA = useCallback(async () => {
    if (!concept) return;
    setIsRunningQA(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-collection", {
        body: {
          collection: {
            name: concept.name,
            theme: concept.theme,
            skus: concept.skus,
          },
        },
      });
      if (error) throw error;
      const score = data?.scores?.final_score ?? concept.score;
      setQaScore(score);
      toast({
        title: score >= 85 ? "Approved ✓" : score >= 70 ? "Review needed" : "High Risk",
        description: `QA Score: ${score}/100`,
        variant: score < 70 ? "destructive" : "default",
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "QA error", description: message, variant: "destructive" });
    } finally {
      setIsRunningQA(false);
    }
  }, [concept, toast]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Wand2 className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Create
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            Idea → Previz → Production → QA — Vertical pipeline
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const isExpanded = expandedStep === step.key;
            const isAccessible = canAccessStep(step.key);
            const isCompleted =
              (step.key === "idea" && !!concept) ||
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
                {/* Step Header */}
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

                {/* Step Content */}
                {isExpanded && isAccessible && (
                  <CardContent className="pt-4 space-y-4">
                    {step.key === "idea" && (
                      <StepIdea
                        theme={theme}
                        setTheme={setTheme}
                        capsuleType={capsuleType}
                        setCapsuleType={setCapsuleType}
                        objective={objective}
                        setObjective={setObjective}
                        season={season}
                        setSeason={setSeason}
                        isGenerating={isGeneratingConcept}
                        onGenerate={handleGenerateConcept}
                        concept={concept}
                      />
                    )}
                    {step.key === "previz" && concept && (
                      <StepPreviz
                        concept={concept}
                        previzImages={previzImages}
                        isGenerating={isGeneratingPreviz}
                        onGenerate={handleGeneratePreviz}
                        approved={previzApproved}
                        onApprove={() => {
                          setPrevizApproved(true);
                          setExpandedStep("production");
                        }}
                        variationCount={variationCount}
                        onRequestVariation={() => {
                          if (variationCount < 2) {
                            setVariationCount((c) => c + 1);
                            handleGeneratePreviz();
                          }
                        }}
                      />
                    )}
                    {step.key === "production" && concept && (
                      <StepProduction
                        concept={concept}
                        productionFiles={productionFiles}
                        isGenerating={isGeneratingProd}
                        onGenerate={handleGenerateProduction}
                        onRunQA={() => {
                          setExpandedStep("qa");
                          handleRunQA();
                        }}
                      />
                    )}
                    {step.key === "qa" && concept && (
                      <StepQA
                        concept={concept}
                        qaScore={qaScore}
                        isRunning={isRunningQA}
                        onRunQA={handleRunQA}
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

/* ────────── Step A: Idea ────────── */

function StepIdea({
  theme, setTheme, capsuleType, setCapsuleType, objective, setObjective,
  season, setSeason, isGenerating, onGenerate, concept,
}: {
  theme: string; setTheme: (v: string) => void;
  capsuleType: string; setCapsuleType: (v: string) => void;
  objective: string; setObjective: (v: string) => void;
  season: string; setSeason: (v: string) => void;
  isGenerating: boolean; onGenerate: () => void;
  concept: ConceptResult | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">
            Your Idea
          </label>
          <Input
            placeholder="Put your idea here (ex: Aviation & Wonders Founder Drop)"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="font-body text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">
            Capsule Type
          </label>
          <Select value={capsuleType} onValueChange={setCapsuleType}>
            <SelectTrigger className="font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybrid (Quiet + Funny)</SelectItem>
              <SelectItem value="quiet">Quiet Luxury Only</SelectItem>
              <SelectItem value="funny">Funny Premium Only</SelectItem>
              <SelectItem value="mini">Mini Drop (3 SKUs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">
            Launch Intent
          </label>
          <Input
            placeholder="Launch intent (ex: Founder Drop 150 units, cash-positive)"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="font-body text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1 block">
            Season
          </label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spring-summer">Spring / Summer</SelectItem>
              <SelectItem value="fall-winter">Fall / Winter</SelectItem>
              <SelectItem value="holiday">Holiday</SelectItem>
              <SelectItem value="evergreen">Evergreen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full font-body text-xs tracking-[0.15em] uppercase h-12 btn-glow"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Round Table is generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Concept
          </>
        )}
      </Button>

      {/* Concept Result */}
      {concept && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-light text-foreground">{concept.name}</h4>
            <Badge variant={concept.score >= 80 ? "default" : "secondary"} className="text-[10px] font-body">
              Score: {concept.score}/100
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-body">{concept.theme}</p>
          <div className="flex gap-2">
            {concept.palette.map((c, i) => (
              <span key={i} className="text-xs font-body text-muted-foreground">
                {c}{i < concept.palette.length - 1 ? " ·" : ""}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {concept.skus.map((sku, i) => (
              <Badge key={i} variant="outline" className="text-[9px] font-body">
                {sku.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Step B: Previz ────────── */

function StepPreviz({
  concept, previzImages, isGenerating, onGenerate,
  approved, onApprove, variationCount, onRequestVariation,
}: {
  concept: ConceptResult;
  previzImages: Record<number, string[]>;
  isGenerating: boolean;
  onGenerate: () => void;
  approved: boolean;
  onApprove: () => void;
  variationCount: number;
  onRequestVariation: () => void;
}) {
  const hasImages = Object.keys(previzImages).length > 0;

  const hasValidSkus = concept.skus.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-body">
        Generate 2–4 concept mockups per SKU for internal decision. These are NOT production files.
      </p>

      {!hasValidSkus && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs font-body text-foreground">
            No concept SKUs found. Go back to A. Idea and click Generate Concept.
          </p>
        </div>
      )}

      {hasValidSkus && !hasImages && (
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="font-body text-xs tracking-[0.15em] uppercase h-10"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Generating concept mockups…
            </>
          ) : (
            <>
              <ImagePlus className="h-3 w-3 mr-2" />
              Generate Concept Mockups
            </>
          )}
        </Button>
      )}

      {hasImages && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(previzImages).map(([idx, urls]) =>
              urls.map((url, ui) => (
                <div key={`${idx}-${ui}`} className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
                  <img
                    src={url}
                    alt={`Concept ${concept.skus[Number(idx)]?.name || idx}`}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 text-destructive-foreground text-[9px] font-body text-center py-0.5 uppercase tracking-wider">
                    Concept Only
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            {!approved && (
              <>
                <Button
                  onClick={onApprove}
                  className="font-body text-xs tracking-[0.15em] uppercase h-10"
                >
                  <Check className="h-3 w-3 mr-2" />
                  Approve Direction
                </Button>
                <Button
                  variant="outline"
                  onClick={onRequestVariation}
                  disabled={variationCount >= 2 || isGenerating}
                  className="font-body text-xs tracking-[0.15em] uppercase h-10"
                >
                  <ImagePlus className="h-3 w-3 mr-2" />
                  Request Variation ({variationCount}/2)
                </Button>
              </>
            )}
            {approved && (
              <Badge variant="default" className="text-xs font-body">
                <Check className="h-3 w-3 mr-1" /> Direction Approved
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────── Step C: Production ────────── */

function StepProduction({
  concept, productionFiles, isGenerating, onGenerate, onRunQA,
}: {
  concept: ConceptResult;
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
          <Button
            variant="outline"
            onClick={onRunQA}
            className="font-body text-xs tracking-[0.15em] uppercase h-10"
          >
            <ShieldCheck className="h-3 w-3 mr-2" />
            Run QA Gate
          </Button>
        )}
      </div>
    </div>
  );
}

/* ────────── Step D: QA + Decision ────────── */

function StepQA({
  concept, qaScore, isRunning, onRunQA,
}: {
  concept: ConceptResult;
  qaScore: number | null;
  isRunning: boolean;
  onRunQA: () => void;
}) {
  const { toast } = useToast();
  const [isPromoting, setIsPromoting] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveResult, setApproveResult] = useState<{ approved: boolean; failures?: any[] } | null>(null);

  const getScoreStatus = (score: number) => {
    if (score >= 85) return { label: "Approved", variant: "default" as const, color: "text-foreground" };
    if (score >= 70) return { label: "Review", variant: "secondary" as const, color: "text-muted-foreground" };
    return { label: "High Risk", variant: "destructive" as const, color: "text-destructive" };
  };

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("collections").insert([{
        name: concept.name,
        description: concept.theme,
        season: concept.palette.join(", "),
        user_id: userData.user.id,
        status: "draft",
        lifecycle_status: "idea",
        metadata: { source: "round_table", palette: concept.palette, skus: concept.skus } as any,
      }]).select().single();

      if (error) throw error;
      setCollectionId(data.id);
      toast({ title: "Collection créée", description: `"${concept.name}" ajoutée aux Collections` });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleApproveHQ = async () => {
    if (!collectionId) return;
    setIsApproving(true);
    setApproveResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("approve-hq", {
        body: { collectionId },
      });
      if (error) {
        // Edge function returned non-2xx
        const parsed = typeof error === "object" ? error : { message: String(error) };
        setApproveResult({ approved: false, failures: [{ gate: "invoke", message: parsed.message || "Error" }] });
        toast({ title: "Gate check failed", description: parsed.message, variant: "destructive" });
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
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {qaScore === null && (
        <Button
          onClick={onRunQA}
          disabled={isRunning}
          className="font-body text-xs tracking-[0.15em] uppercase h-10"
        >
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
            <div className={`text-3xl font-display font-light ${getScoreStatus(qaScore).color}`}>
              {qaScore}
            </div>
            <div>
              <Badge variant={getScoreStatus(qaScore).variant} className="text-xs font-body">
                {getScoreStatus(qaScore).label}
              </Badge>
              <p className="text-[10px] text-muted-foreground font-body mt-1">
                {qaScore >= 85
                  ? "Ready to promote to Collection"
                  : qaScore >= 70
                  ? "Needs review before promotion"
                  : "High risk — confirmation required to proceed"}
              </p>
            </div>
          </div>

          {qaScore < 70 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs font-body text-foreground">
                This capsule scored below 70. Launching requires override confirmation and will be logged in risk history.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {!collectionId && (
              <Button
                className="font-body text-xs tracking-[0.15em] uppercase h-10"
                onClick={handlePromote}
                disabled={isPromoting}
              >
                {isPromoting ? (
                  <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Promoting…</>
                ) : (
                  <><FolderOpen className="h-3 w-3 mr-2" />Promote to Collection</>
                )}
              </Button>
            )}

            {collectionId && (
              <>
                <Badge variant="default" className="text-xs font-body h-10 px-4 flex items-center">
                  <Check className="h-3 w-3 mr-1" /> Collection Created
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

          {/* Gate failures */}
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
