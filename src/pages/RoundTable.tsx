import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCAD } from "@/lib/pricing";
import { exportCollectionPDF } from "@/lib/export-collection-pdf";
import {
  Users, Sparkles, Package, Loader2, Save, Check,
  ShoppingBag, Palette, FileDown, ShieldCheck, ShieldX,
  Truck, Factory, AlertTriangle, Calendar, ChevronDown, ChevronUp,
  ImagePlus, Image,
} from "lucide-react";
import { RoundTableAgentCards } from "@/components/RoundTableAgentCards";

// ── Types matching new strict JSON contract ──

interface SKUPricing {
  retail_cad: number;
  estimated_cost_cad: number;
  margin_pct: number;
  bundle_eligible: boolean;
}

interface AOPSpec {
  tile_size_px: number;
  repeat_type: string;
  density_rule: string;
  panel_mapping: string[];
  seam_safety: string;
  color_limit: number;
}

interface SKU {
  sku_name: string;
  audience: "parent" | "kid";
  category: string;
  provider: "printful" | "kin_custom";
  print_type: "DTG" | "Embroidery" | "AOP";
  design_direction: string;
  design_prompt: string;
  negative_prompt: string;
  aop_spec: AOPSpec | null;
  pricing: SKUPricing;
}

interface Bundle {
  bundle_name: string;
  items: string[];
  discount_pct: number;
  bundle_price_cad: number;
  bundle_margin_pct: number;
}

interface FinanceGate {
  must_pass: boolean;
  passed: boolean;
  fail_reasons: string[];
  fixes_applied: string[];
  avg_margin_pct: number;
  aov_target_cad: number;
}

interface Deliverables {
  printful_pack: { included: boolean; files: string[]; spec: string };
  kin_pack: { included: boolean; files: string[]; spec: string };
}

interface MarketingCalendar {
  week_1: string;
  week_2: string;
  week_3: string;
  week_4: string;
}

interface Collection {
  name: string;
  tagline: string;
  theme: string;
  why_now: string;
  palette: string[];
  skus: SKU[];
  bundles: Bundle[];
  finance_gate: FinanceGate;
  deliverables: Deliverables;
  marketing_calendar: MarketingCalendar | null;
  agent_notes: Record<string, string>;
}

interface RunMeta {
  idea: string;
  timestamp: string;
  brand_theme: string;
  budget_monthly_cad: number;
  dna_version: string;
  model_used?: string;
  fallback_used?: boolean;
}

interface RoundTableOutput {
  run_meta: RunMeta;
  collections: Collection[];
}

const AGENT_ICONS: Record<string, string> = {
  brand_strategy: "🎯",
  creative_director: "🎭",
  artistic_designer: "🎨",
  pod_specialist: "🖨️",
  storytelling: "📖",
  growth: "📈",
  financial: "💰",
};

const AGENT_LABELS: Record<string, string> = {
  brand_strategy: "Brand Strategy",
  creative_director: "Creative Director",
  artistic_designer: "Artistic Designer",
  pod_specialist: "POD Specialist",
  storytelling: "Storytelling",
  growth: "Growth",
  financial: "Financial Gatekeeper",
};

type MockupMap = Record<string, string>;

export default function RoundTable() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [idea, setIdea] = useState("");
  const [output, setOutput] = useState<RoundTableOutput | null>(null);
  const [activeCollection, setActiveCollection] = useState("0");
  const [mockups, setMockups] = useState<MockupMap>({});
  const [generatingMockups, setGeneratingMockups] = useState<Record<string, boolean>>({});
  const [savedCollections, setSavedCollections] = useState<Record<number, string>>({});
  const [savingCollection, setSavingCollection] = useState<Record<number, boolean>>({});
  const [exportingPDF, setExportingPDF] = useState<Record<number, boolean>>({});

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMockups({});
    setSavedCollections({});
    setOutput(null);
    try {
      const { data, error } = await supabase.functions.invoke("round-table", {
        body: {
          idea: idea.trim() || "Aviation & Wonders — drop de lancement",
          count: 3,
          mode: "launch",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOutput(data as RoundTableOutput);
      setActiveCollection("0");
      toast({
        title: "Round Table terminé",
        description: `${data.collections?.length || 0} collections générées — Finance gate enforced`,
      });
    } catch (e: any) {
      console.error("Round table error:", e);
      toast({ title: "Erreur Round Table", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMockup = async (ci: number, si: number, sku: SKU) => {
    const key = `${ci}-${si}`;
    setGeneratingMockups((p) => ({ ...p, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: { prompt: sku.design_prompt, skuName: sku.sku_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        setMockups((p) => ({ ...p, [key]: data.imageUrl }));
        toast({ title: "Mock-up généré", description: `"${sku.sku_name}"` });
      }
    } catch (e: any) {
      toast({ title: "Erreur mock-up", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingMockups((p) => ({ ...p, [key]: false }));
    }
  };

  const handleSaveCollection = async (ci: number) => {
    if (!output) return;
    const collection = output.collections[ci];
    if (!collection) return;

    // HARD GATE: block save if finance gate failed
    if (!collection.finance_gate?.passed) {
      toast({
        title: "BLOCKED — Finance Gate Failed",
        description: "Fix all margin violations before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingCollection((p) => ({ ...p, [ci]: true }));
    try {
      const skuMockups: Record<number, string> = {};
      collection.skus?.forEach((_, si) => {
        const key = `${ci}-${si}`;
        if (mockups[key]) skuMockups[si] = mockups[key];
      });

      const { data, error } = await supabase.functions.invoke("save-collection", {
        body: { collection, run_meta: output.run_meta, mockups: skuMockups },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSavedCollections((p) => ({ ...p, [ci]: data.collectionId }));
      toast({ title: "Collection sauvegardée", description: `"${collection.name}" — ${data.skuCount} SKUs` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingCollection((p) => ({ ...p, [ci]: false }));
    }
  };

  const handleExportPDF = async (ci: number) => {
    if (!output) return;
    const collection = output.collections[ci];
    if (!collection) return;
    setExportingPDF((p) => ({ ...p, [ci]: true }));
    try {
      // Adapt to legacy PDF exporter shape
      const legacyCollection = {
        name: collection.name,
        theme: collection.theme,
        season: "SS26",
        palette: collection.palette,
        thank_you_note: collection.tagline,
        agent_notes: collection.agent_notes,
        skus: collection.skus.map((s) => ({
          name: s.sku_name,
          type: (s.audience === "kid" ? "funny" : "quiet") as "funny" | "quiet",
          products: [s.category],
          placement: s.design_direction,
          adult_base_cost: s.pricing.estimated_cost_cad,
          kid_base_cost: s.pricing.estimated_cost_cad,
          adult_retail: s.pricing.retail_cad,
          kid_retail: s.pricing.retail_cad,
          bundle_price: collection.bundles?.[0]?.bundle_price_cad || s.pricing.retail_cad,
          bundle_with_perso: (collection.bundles?.[0]?.bundle_price_cad || s.pricing.retail_cad) + 15,
          margin_pct: s.pricing.margin_pct,
          mockup_brief: s.design_prompt,
          story: { mythology: "", punchlines: [], shopify_description: "", tiktok_caption: "", instagram_caption: "", hero_image_brief: "" },
        })),
      };
      await exportCollectionPDF(legacyCollection, mockups, ci, console.log);
      toast({ title: "PDF exporté", description: `"${collection.name}"` });
    } catch (e: any) {
      toast({ title: "Erreur PDF", description: e.message, variant: "destructive" });
    } finally {
      setExportingPDF((p) => ({ ...p, [ci]: false }));
    }
  };

  const collections = output?.collections || [];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Collection Engine — Round Table
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Finance-first · Supplier routing · Output pack A→Z
          </p>
        </div>

        <RoundTableAgentCards isActive={isGenerating} />

        {/* Input */}
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <Textarea
              placeholder="Idea: Aviation & Wonders — drop de lancement, thème polar, etc."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="font-body text-sm min-h-[80px]"
            />
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full font-body text-xs tracking-[0.2em] uppercase h-14 btn-glow"
            >
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />7 agents collaborent…</>
              ) : (
                <><Sparkles className="h-5 w-5 mr-2" />Run Round Table for 3 Collections</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Run Meta */}
        {output?.run_meta && (
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4 flex flex-wrap gap-4 text-xs font-body text-muted-foreground">
              <span>Model: <strong className="text-foreground">{output.run_meta.model_used || "—"}</strong></span>
              <span>Budget: <strong className="text-foreground">{output.run_meta.budget_monthly_cad} CAD/mo</strong></span>
              <span>Theme: <strong className="text-foreground">{output.run_meta.brand_theme}</strong></span>
              {output.run_meta.fallback_used && <Badge variant="outline" className="text-[9px]">Fallback used</Badge>}
            </CardContent>
          </Card>
        )}

        {/* Collections */}
        {collections.length > 0 && (
          <Tabs value={activeCollection} onValueChange={setActiveCollection}>
            <TabsList className="w-full justify-start">
              {collections.map((c, i) => (
                <TabsTrigger key={i} value={String(i)} className="font-body text-xs gap-1.5">
                  {c.finance_gate?.passed ? (
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ShieldX className="h-3 w-3 text-destructive" />
                  )}
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {collections.map((collection, ci) => (
              <TabsContent key={ci} value={String(ci)} className="space-y-6 mt-6">
                <CollectionView
                  collection={collection}
                  ci={ci}
                  mockups={mockups}
                  generatingMockups={generatingMockups}
                  onGenerateMockup={handleGenerateMockup}
                  onSave={handleSaveCollection}
                  onExportPDF={handleExportPDF}
                  isExporting={exportingPDF[ci] || false}
                  isSaving={savingCollection[ci] || false}
                  savedId={savedCollections[ci]}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

// ── Collection View ──

interface CollectionViewProps {
  collection: Collection;
  ci: number;
  mockups: MockupMap;
  generatingMockups: Record<string, boolean>;
  onGenerateMockup: (ci: number, si: number, sku: SKU) => void;
  onSave: (ci: number) => void;
  onExportPDF: (ci: number) => void;
  isExporting: boolean;
  isSaving: boolean;
  savedId?: string;
}

function CollectionView({
  collection, ci, mockups, generatingMockups,
  onGenerateMockup, onSave, onExportPDF, isExporting, isSaving, savedId,
}: CollectionViewProps) {
  const gatePassed = collection.finance_gate?.passed;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className={`border-border ${gatePassed ? "gradient-card-warm" : "border-destructive/30"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-xl font-light flex items-center gap-2">
            <Package className="h-5 w-5" />
            {collection.name}
            <Badge variant={gatePassed ? "secondary" : "destructive"} className="ml-auto text-[9px] font-body">
              {gatePassed ? "FINANCE GATE ✓" : "FINANCE GATE ✗"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-body italic text-foreground">"{collection.tagline}"</p>
          <p className="text-xs text-muted-foreground font-body">{collection.theme}</p>
          {collection.why_now && (
            <p className="text-xs text-muted-foreground font-body">
              <strong>Why now:</strong> {collection.why_now}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {collection.palette.map((c, i) => (
              <span key={i} className="text-xs font-body text-muted-foreground">{c}{i < collection.palette.length - 1 ? " ·" : ""}</span>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onSave(ci)} disabled={isSaving || !!savedId || !gatePassed}
              className="font-body text-[10px] tracking-wider uppercase">
              {isSaving ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Sauvegarde…</> :
                savedId ? <><Check className="h-3 w-3 mr-1.5" />Sauvegardée ✓</> :
                  !gatePassed ? <><ShieldX className="h-3 w-3 mr-1.5" />Blocked by Finance Gate</> :
                    <><Save className="h-3 w-3 mr-1.5" />Sauvegarder</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExportPDF(ci)} disabled={isExporting}
              className="font-body text-[10px] tracking-wider uppercase">
              {isExporting ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Export…</> :
                <><FileDown className="h-3 w-3 mr-1.5" />PDF</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Finance Gate */}
      <FinanceGateCard gate={collection.finance_gate} />

      {/* Agent Notes */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm font-light">Agent Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(collection.agent_notes || {}).map(([key, note]) => (
              <div key={key} className="p-2.5 rounded-md bg-muted/50 border border-border">
                <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">
                  {AGENT_ICONS[key]} {AGENT_LABELS[key] || key}
                </p>
                <p className="text-xs font-body text-foreground">{note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bundles */}
      {collection.bundles?.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm font-light flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Bundles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {collection.bundles.map((b, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/50 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs font-body font-medium text-foreground">{b.bundle_name}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{b.items.join(" + ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-body font-medium text-foreground">{formatCAD(b.bundle_price_cad)}</p>
                    <p className="text-[10px] text-muted-foreground font-body">
                      -{b.discount_pct}% · Marge {b.bundle_margin_pct}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      <DeliverablesCard deliverables={collection.deliverables} />

      {/* Marketing Calendar */}
      {collection.marketing_calendar && <MarketingCalendarCard calendar={collection.marketing_calendar} />}

      {/* SKUs */}
      <div className="space-y-4">
        <h3 className="font-display text-sm font-light text-foreground flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          {collection.skus?.length || 0} SKUs
        </h3>
        {collection.skus?.map((sku, si) => (
          <SKUCard
            key={si}
            sku={sku}
            index={si}
            mockupUrl={mockups[`${ci}-${si}`]}
            isGeneratingMockup={generatingMockups[`${ci}-${si}`] || false}
            onGenerateMockup={() => onGenerateMockup(ci, si, sku)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Finance Gate Card ──

function FinanceGateCard({ gate }: { gate: FinanceGate }) {
  if (!gate) return null;
  return (
    <Card className={`border-border ${gate.passed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {gate.passed ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldX className="h-5 w-5 text-destructive" />
          )}
          <span className="font-body text-sm font-medium text-foreground">
            Finance Gate — {gate.passed ? "PASSED" : "FAILED"}
          </span>
          <Badge variant="outline" className="ml-auto text-[9px] font-body">
            Avg margin: {gate.avg_margin_pct}%
          </Badge>
        </div>

        {gate.fail_reasons?.length > 0 && (
          <div className="space-y-1">
            {gate.fail_reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-body text-destructive">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                {r}
              </div>
            ))}
          </div>
        )}

        {gate.fixes_applied?.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Auto-fixes applied</p>
            {gate.fixes_applied.map((f, i) => (
              <p key={i} className="text-xs font-body text-muted-foreground">• {f}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Deliverables Card ──

function DeliverablesCard({ deliverables }: { deliverables: Deliverables }) {
  if (!deliverables) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm font-light flex items-center gap-2">
          <Factory className="h-4 w-4" /> Deliverables
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {deliverables.printful_pack?.included && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">
                <Truck className="h-3 w-3 inline mr-1" />Printful Pack
              </p>
              <p className="text-xs font-body text-foreground">{deliverables.printful_pack.spec}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{deliverables.printful_pack.files.join(", ")}</p>
            </div>
          )}
          {deliverables.kin_pack?.included && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">
                <Factory className="h-3 w-3 inline mr-1" />Kin Custom Pack
              </p>
              <p className="text-xs font-body text-foreground">{deliverables.kin_pack.spec}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{deliverables.kin_pack.files.join(", ")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Marketing Calendar Card ──

function MarketingCalendarCard({ calendar }: { calendar: MarketingCalendar }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm font-light flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Marketing Calendar
          <Badge variant="secondary" className="text-[9px] font-body ml-auto">Finance Gate Passed</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {(["week_1", "week_2", "week_3", "week_4"] as const).map((w, i) => (
            <div key={w} className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Week {i + 1}</p>
              <p className="text-xs font-body text-foreground">{calendar[w]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── SKU Card ──

function SKUCard({ sku, index, mockupUrl, isGeneratingMockup, onGenerateMockup }: {
  sku: SKU;
  index: number;
  mockupUrl?: string;
  isGeneratingMockup: boolean;
  onGenerateMockup: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isKin = sku.provider === "kin_custom";

  return (
    <Card className="border-border">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-sm font-light text-foreground">{sku.sku_name}</h4>
            <Badge variant={sku.audience === "kid" ? "outline" : "secondary"} className="text-[9px] font-body">
              {sku.audience === "kid" ? "Kid" : "Parent"}
            </Badge>
            <Badge variant="outline" className="text-[9px] font-body capitalize">{sku.category}</Badge>
            <Badge variant={isKin ? "default" : "secondary"} className="text-[9px] font-body">
              {isKin ? "Kin Custom" : "Printful"} · {sku.print_type}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground font-body">#{index + 1}</span>
        </div>

        {/* Mockup */}
        {mockupUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-border bg-muted/20">
            <img src={mockupUrl} alt={sku.sku_name} className="w-full h-auto max-h-80 object-contain" loading="lazy" />
          </div>
        )}

        {/* Design direction */}
        <p className="text-xs text-muted-foreground font-body mb-3">{sku.design_direction}</p>

        {/* Pricing */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <PriceCell label="Retail" value={formatCAD(sku.pricing.retail_cad)} />
          <PriceCell label="Cost" value={formatCAD(sku.pricing.estimated_cost_cad)} />
          <PriceCell
            label="Margin"
            value={`${sku.pricing.margin_pct}%`}
            highlight={sku.pricing.margin_pct >= 55}
            danger={sku.pricing.margin_pct < 55}
          />
        </div>

        {/* AOP Spec badge */}
        {sku.aop_spec && (
          <div className="mb-3 p-2 rounded bg-muted/50 border border-border">
            <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">AOP Spec</p>
            <p className="text-xs font-body text-foreground">
              {sku.aop_spec.tile_size_px}px · {sku.aop_spec.repeat_type} · {sku.aop_spec.color_limit} colors · {sku.aop_spec.panel_mapping.join(", ")}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}
            className="text-xs font-body text-muted-foreground p-0 h-auto">
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? "Hide prompts" : "Show prompts"}
          </Button>
          {!mockupUrl && (
            <Button variant="ghost" size="sm" onClick={onGenerateMockup} disabled={isGeneratingMockup}
              className="text-xs font-body text-muted-foreground p-0 h-auto">
              {isGeneratingMockup ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating…</>
              ) : (
                <><ImagePlus className="h-3 w-3 mr-1" />Generate mock-up</>
              )}
            </Button>
          )}
          {mockupUrl && (
            <a href={mockupUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Image className="h-3 w-3" />Open image
            </a>
          )}
        </div>

        {/* Expanded: Prompts */}
        {expanded && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Design Prompt</p>
              <p className="text-xs font-body text-foreground bg-muted/50 p-2 rounded">{sku.design_prompt}</p>
            </div>
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Negative Prompt</p>
              <p className="text-xs font-body text-foreground bg-muted/50 p-2 rounded">{sku.negative_prompt}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriceCell({ label, value, highlight, danger }: {
  label: string; value: string; highlight?: boolean; danger?: boolean;
}) {
  return (
    <div className={`p-2 rounded text-center ${danger ? "bg-destructive/10 border border-destructive/20" : highlight ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-muted/50"}`}>
      <p className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-body font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
