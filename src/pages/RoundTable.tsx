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
import {
  Users, Sparkles, Package, DollarSign, BookOpen, Loader2,
  ShoppingBag, Palette, MessageSquare, Crown, Laugh,
} from "lucide-react";

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

export default function RoundTable() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState("0");

  const handleGenerate = async () => {
    setIsGenerating(true);
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
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(AGENT_LABELS).map(([key, label]) => (
              <Badge key={key} variant="secondary" className="text-[10px] font-body">
                {AGENT_ICONS[key]} {label}
              </Badge>
            ))}
          </div>
        </div>

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
                <CollectionView collection={collection} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

function CollectionView({ collection }: { collection: Collection }) {
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
          {collection.skus?.length || 0} SKUs
        </h3>
        {collection.skus?.map((sku, si) => (
          <SKUCard key={si} sku={sku} index={si} />
        ))}
      </div>
    </div>
  );
}

function SKUCard({ sku, index }: { sku: SKU; index: number }) {
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-body text-muted-foreground p-0 h-auto"
        >
          <BookOpen className="h-3 w-3 mr-1" />
          {expanded ? "Masquer storytelling" : "Voir storytelling"}
        </Button>

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
