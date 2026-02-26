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
  Users, Sparkles, Package, BookOpen, Loader2, Save, Check,
  ShoppingBag, Palette, MessageSquare, Crown, Laugh, Image, ImagePlus,
  FileDown,
} from "lucide-react";
import { RoundTableAgentCards } from "@/components/RoundTableAgentCards";

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
  brand_strategy: "Brand Strategy Specialist",
  creative_director: "Creative & Mythology Director",
  artistic_designer: "Artistic Designer",
  pod_specialist: "POD Specialist",
  storytelling: "Storytelling Grok",
  growth: "Growth & Conversion Strategist",
  financial: "Financial Gatekeeper",
};

interface SKUStory {
  mythology: string;
  punchlines: string[];
  shopify_description: string;
  tiktok_caption: string;
  instagram_caption: string;
  hero_image_brief: string;
}

interface SKU {
  name: string;
  type: "quiet" | "funny";
  products: string[];
  placement: string;
  adult_base_cost: number;
  kid_base_cost: number;
  adult_retail: number;
  kid_retail: number;
  bundle_price: number;
  bundle_with_perso: number;
  margin_pct: number;
  mockup_brief: string;
  story: SKUStory;
}

interface Collection {
  name: string;
  theme: string;
  season: string;
  palette: string[];
  thank_you_note: string;
  agent_notes: Record<string, string>;
  skus: SKU[];
}

// Track mockup images by collection index + sku index
type MockupMap = Record<string, string>; // "ci-si" -> imageUrl

export default function RoundTable() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
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
    try {
      const { data, error } = await supabase.functions.invoke("round-table", {
        body: { customInstructions: customInstructions.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const cols = data?.collections || [];
      setCollections(cols);
      setActiveCollection("0");
      toast({
        title: "Round Table terminé",
        description: `${cols.length} collections générées par les 7 agents`,
      });
    } catch (e: any) {
      console.error("Round table error:", e);
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMockup = async (ci: number, si: number, sku: SKU) => {
    const key = `${ci}-${si}`;
    setGeneratingMockups((prev) => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-mockup", {
        body: { prompt: sku.mockup_brief, skuName: sku.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        setMockups((prev) => ({ ...prev, [key]: data.imageUrl }));
        toast({
          title: "Mock-up généré",
          description: `Visuel prêt pour "${sku.name}"`,
        });
      }
    } catch (e: any) {
      console.error("Mockup error:", e);
      toast({ title: "Erreur mock-up", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingMockups((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleGenerateAllMockups = async (ci: number) => {
    const collection = collections[ci];
    if (!collection?.skus) return;

    toast({
      title: "Génération en cours",
      description: `Génération de ${collection.skus.length} mock-ups pour "${collection.name}"…`,
    });

    // Generate sequentially to avoid rate limits
    for (let si = 0; si < collection.skus.length; si++) {
      const key = `${ci}-${si}`;
      if (mockups[key]) continue; // skip already generated
      await handleGenerateMockup(ci, si, collection.skus[si]);
    }
  };

  const handleSaveCollection = async (ci: number) => {
    const collection = collections[ci];
    if (!collection) return;

    setSavingCollection((prev) => ({ ...prev, [ci]: true }));
    try {
      const skuMockups: Record<number, string> = {};
      collection.skus?.forEach((_, si) => {
        const key = `${ci}-${si}`;
        if (mockups[key]) skuMockups[si] = mockups[key];
      });

      const { data, error } = await supabase.functions.invoke("save-collection", {
        body: { collection, mockups: skuMockups },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSavedCollections((prev) => ({ ...prev, [ci]: data.collectionId }));
      toast({
        title: "Collection sauvegardée",
        description: `"${collection.name}" enregistrée avec ${data.skuCount} SKUs`,
      });
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingCollection((prev) => ({ ...prev, [ci]: false }));
    }
  };

  const handleExportPDF = async (ci: number) => {
    const collection = collections[ci];
    if (!collection) return;

    setExportingPDF((prev) => ({ ...prev, [ci]: true }));
    try {
      await exportCollectionPDF(collection, mockups, ci, (msg) => {
        console.log("PDF export:", msg);
      });
      toast({
        title: "PDF exporté",
        description: `"${collection.name}" téléchargé avec succès`,
      });
    } catch (e: any) {
      console.error("PDF export error:", e);
      toast({ title: "Erreur PDF", description: e.message, variant: "destructive" });
    } finally {
      setExportingPDF((prev) => ({ ...prev, [ci]: false }));
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Round Table
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            7 agents collaborent pour générer 3 collections complètes en un seul pass
          </p>
        </div>

        {/* Agent Cards */}
        <RoundTableAgentCards isActive={isGenerating} />

        {/* Instructions + Launch */}
        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <Textarea
              placeholder="Instructions additionnelles (optionnel) : thèmes, saisons, couleurs préférées…"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="font-body text-sm min-h-[80px]"
            />
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full font-body text-xs tracking-[0.2em] uppercase h-14 btn-glow"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Les 7 agents collaborent…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Run Round Table for 3 Collections
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {collections.length > 0 && (
          <Tabs value={activeCollection} onValueChange={setActiveCollection}>
            <TabsList className="w-full justify-start">
              {collections.map((c, i) => (
                <TabsTrigger key={i} value={String(i)} className="font-body text-xs">
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {collections.map((collection, ci) => (
              <TabsContent key={ci} value={String(ci)} className="space-y-6 mt-6">
                <CollectionView
                  collection={collection}
                  collectionIndex={ci}
                  mockups={mockups}
                  generatingMockups={generatingMockups}
                  onGenerateMockup={handleGenerateMockup}
                  onGenerateAllMockups={handleGenerateAllMockups}
                  onSaveCollection={handleSaveCollection}
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

interface CollectionViewProps {
  collection: Collection;
  collectionIndex: number;
  mockups: MockupMap;
  generatingMockups: Record<string, boolean>;
  onGenerateMockup: (ci: number, si: number, sku: SKU) => void;
  onGenerateAllMockups: (ci: number) => void;
  onSaveCollection: (ci: number) => void;
  onExportPDF: (ci: number) => void;
  isExporting: boolean;
  isSaving: boolean;
  savedId?: string;
}

function CollectionView({
  collection,
  collectionIndex,
  mockups,
  generatingMockups,
  onGenerateMockup,
  onGenerateAllMockups,
  onSaveCollection,
  onExportPDF,
  isExporting,
  isSaving,
  savedId,
}: CollectionViewProps) {
  const generatedCount = collection.skus?.filter((_, si) => mockups[`${collectionIndex}-${si}`]).length || 0;
  const totalSkus = collection.skus?.length || 0;
  const isAnyGenerating = collection.skus?.some((_, si) => generatingMockups[`${collectionIndex}-${si}`]) || false;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-border gradient-card-warm">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-xl font-light flex items-center gap-2">
            <Package className="h-5 w-5" />
            {collection.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground font-body">{collection.theme}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Saison</span>
            <Badge variant="outline" className="text-[10px] font-body">{collection.season}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {collection.palette.map((c, i) => (
                <span key={i} className="text-xs font-body text-muted-foreground">{c}{i < collection.palette.length - 1 ? " ·" : ""}</span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateAllMockups(collectionIndex)}
              disabled={isAnyGenerating || generatedCount === totalSkus}
              className="font-body text-[10px] tracking-wider uppercase"
            >
              {isAnyGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Génération en cours…
                </>
              ) : generatedCount === totalSkus ? (
                <>
                  <Image className="h-3 w-3 mr-1.5" />
                  {totalSkus} mock-ups générés ✓
                </>
              ) : (
                <>
                  <ImagePlus className="h-3 w-3 mr-1.5" />
                  Générer tous les mock-ups ({generatedCount}/{totalSkus})
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => onSaveCollection(collectionIndex)}
              disabled={isSaving || !!savedId}
              className="font-body text-[10px] tracking-wider uppercase"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Sauvegarde…
                </>
              ) : savedId ? (
                <>
                  <Check className="h-3 w-3 mr-1.5" />
                  Sauvegardée ✓
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1.5" />
                  Sauvegarder en Collection
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExportPDF(collectionIndex)}
              disabled={isExporting}
              className="font-body text-[10px] tracking-wider uppercase"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Export PDF…
                </>
              ) : (
                <>
                  <FileDown className="h-3 w-3 mr-1.5" />
                  Exporter PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Notes */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-light flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Notes des Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(collection.agent_notes || {}).map(([key, note]) => (
              <div key={key} className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">
                  {AGENT_ICONS[key]} {AGENT_LABELS[key]}
                </p>
                <p className="text-xs font-body text-foreground leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thank You Note */}
      {collection.thank_you_note && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-5">
            <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-2">
              📦 Thank You Note Packaging
            </p>
            <p className="text-sm font-body italic text-foreground leading-relaxed">
              "{collection.thank_you_note}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* SKUs */}
      <div className="space-y-4">
        <h3 className="font-display text-base font-light text-foreground flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          {totalSkus} SKUs
        </h3>
        {collection.skus?.map((sku, si) => (
          <SKUCard
            key={si}
            sku={sku}
            index={si}
            mockupUrl={mockups[`${collectionIndex}-${si}`]}
            isGeneratingMockup={generatingMockups[`${collectionIndex}-${si}`] || false}
            onGenerateMockup={() => onGenerateMockup(collectionIndex, si, sku)}
          />
        ))}
      </div>
    </div>
  );
}

interface SKUCardProps {
  sku: SKU;
  index: number;
  mockupUrl?: string;
  isGeneratingMockup: boolean;
  onGenerateMockup: () => void;
}

function SKUCard({ sku, index, mockupUrl, isGeneratingMockup, onGenerateMockup }: SKUCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isQuiet = sku.type === "quiet";

  return (
    <Card className="border-border card-lift">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isQuiet ? (
              <Crown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Laugh className="h-4 w-4 text-muted-foreground" />
            )}
            <h4 className="font-display text-sm font-light text-foreground">{sku.name}</h4>
            <Badge variant={isQuiet ? "secondary" : "outline"} className="text-[9px] font-body">
              {isQuiet ? "Quiet Luxury" : "Funny Premium"}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground font-body">#{index + 1}</span>
        </div>

        {/* Mock-up Image */}
        {mockupUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-border bg-muted/20">
            <img
              src={mockupUrl}
              alt={`Mock-up ${sku.name}`}
              className="w-full h-auto max-h-80 object-contain"
              loading="lazy"
            />
          </div>
        )}

        {/* Placement */}
        <p className="text-xs text-muted-foreground font-body mb-3">{sku.placement}</p>

        {/* Pricing Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          <PriceCell label="Adult Cost" value={formatCAD(sku.adult_base_cost)} />
          <PriceCell label="Kid Cost" value={formatCAD(sku.kid_base_cost)} />
          <PriceCell label="Adult Retail" value={formatCAD(sku.adult_retail)} />
          <PriceCell label="Kid Retail" value={formatCAD(sku.kid_retail)} />
          <PriceCell label="Bundle" value={formatCAD(sku.bundle_price)} highlight />
          <PriceCell label="Bundle+Perso" value={formatCAD(sku.bundle_with_perso)} />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[9px] font-body">
            Marge {sku.margin_pct}%
          </Badge>
          <div className="flex gap-1">
            {sku.products?.map((p) => (
              <Badge key={p} variant="secondary" className="text-[9px] font-body capitalize">
                {p}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-body text-muted-foreground p-0 h-auto"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            {expanded ? "Masquer storytelling" : "Voir storytelling"}
          </Button>

          {!mockupUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerateMockup}
              disabled={isGeneratingMockup}
              className="text-xs font-body text-muted-foreground p-0 h-auto"
            >
              {isGeneratingMockup ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <ImagePlus className="h-3 w-3 mr-1" />
                  Générer mock-up
                </>
              )}
            </Button>
          )}

          {mockupUrl && (
            <a
              href={mockupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Image className="h-3 w-3" />
              Ouvrir l'image
            </a>
          )}
        </div>

        {expanded && sku.story && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Mythologie</p>
              <p className="text-xs font-body text-foreground italic">{sku.story.mythology}</p>
            </div>
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Punchlines</p>
              <ul className="space-y-1">
                {sku.story.punchlines?.map((p, i) => (
                  <li key={i} className="text-xs font-body text-foreground">• {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Shopify</p>
              <p className="text-xs font-body text-foreground">{sku.story.shopify_description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">TikTok</p>
                <p className="text-xs font-body text-foreground">{sku.story.tiktok_caption}</p>
              </div>
              <div>
                <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">Instagram</p>
                <p className="text-xs font-body text-foreground">{sku.story.instagram_caption}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1">🎨 Mock-up Brief</p>
              <p className="text-xs font-body text-foreground bg-muted/50 p-2 rounded">{sku.mockup_brief}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriceCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded text-center ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
      <p className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-body font-medium ${highlight ? "text-foreground" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
