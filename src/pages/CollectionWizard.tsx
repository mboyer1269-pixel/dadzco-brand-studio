import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WizardStepType } from "@/components/wizard/WizardStepType";
import { WizardStepConfig } from "@/components/wizard/WizardStepConfig";
import { WizardStepSKUs } from "@/components/wizard/WizardStepSKUs";
import { WizardStepStories } from "@/components/wizard/WizardStepStories";
import { WizardStepPreview } from "@/components/wizard/WizardStepPreview";
import { COLLECTION_TYPES, FUNNY_SKU_NAMES, type CollectionType, type WizardSKU, type WizardState } from "@/lib/collection-types";
import { calculateSKUPricing } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const STEPS = ["Type", "Configure", "Pricing", "Stories", "Preview"];

function generateSKUs(type: CollectionType, style: string, palette: string[]): WizardSKU[] {
  const skus: WizardSKU[] = [];
  const quietNames = ["Écho Géométrique I", "Écho Géométrique II", "Écho Linéaire", "Écho Minimaliste"];
  const heroNames = ["Le Patriarche — Édition Limitée"];

  const makeSKU = (name: string, skuType: "quiet" | "funny" | "hero"): WizardSKU => ({
    id: crypto.randomUUID(),
    name,
    type: skuType,
    baseCost: 0,
    retailPrice: 0,
    margin: 0,
    marginPct: 0,
    personalization: false,
    style,
    palette,
  });

  if (type === "quiet" || type === "hybrid") {
    quietNames.forEach((n) => skus.push(makeSKU(n, "quiet")));
  }
  if (type === "funny" || type === "hybrid") {
    FUNNY_SKU_NAMES.slice(0, 3).forEach((n) => skus.push(makeSKU(n, "funny")));
  }
  if (type === "hero" || type === "hybrid") {
    heroNames.forEach((n) => skus.push(makeSKU(n, "hero")));
  }

  return skus;
}

export default function CollectionWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<WizardState>({
    step: 0,
    collectionType: null,
    name: "",
    season: "",
    palette: ["sable", "navy", "creme"],
    style: "puff",
    skus: [],
    isGenerating: false,
    isGeneratingStories: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [approvedVariant, setApprovedVariant] = useState<"A" | "B" | null>(null);

  const canProceed = () => {
    switch (state.step) {
      case 0: return !!state.collectionType;
      case 1: return state.name.trim().length > 0 && state.palette.length > 0 && !!state.style;
      case 2: return state.skus.length > 0 && state.skus.every((s) => s.baseCost > 0);
      default: return true;
    }
  };

  const handleNext = () => {
    if (state.step === 1 && state.skus.length === 0 && state.collectionType) {
      const skus = generateSKUs(state.collectionType, state.style, state.palette);
      setState((s) => ({ ...s, step: s.step + 1, skus }));
    } else {
      setState((s) => ({ ...s, step: Math.min(s.step + 1, STEPS.length - 1) }));
    }
  };

  const handleBack = () => {
    setState((s) => ({ ...s, step: Math.max(s.step - 1, 0) }));
  };

  const handleUpdateSKU = useCallback((index: number, updates: Partial<WizardSKU>) => {
    setState((s) => {
      const newSkus = [...s.skus];
      newSkus[index] = { ...newSkus[index], ...updates };
      return { ...s, skus: newSkus };
    });
  }, []);

  const handleGenerateStories = async () => {
    setState((s) => ({ ...s, isGeneratingStories: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-stories", {
        body: {
          skus: state.skus.map((s) => ({ name: s.name, type: s.type, style: s.style })),
          collectionName: state.name,
          collectionType: state.collectionType,
        },
      });

      if (error) throw error;

      if (data?.stories) {
        setState((s) => {
          const newSkus = s.skus.map((sku) => {
            const story = data.stories.find((st: any) => st.name === sku.name);
            if (story) {
              return {
                ...sku,
                story: {
                  mythology: story.mythology,
                  punchlines: story.punchlines,
                  shopifyDescription: story.shopify_description,
                  tiktokCaption: story.tiktok_caption,
                  instagramCaption: story.instagram_caption,
                  heroImageBrief: story.hero_image_brief,
                },
              };
            }
            return sku;
          });
          return { ...s, skus: newSkus, isGeneratingStories: false };
        });
        toast({ title: "Stories generated", description: `${data.stories.length} narratives created` });
      }
    } catch (e: any) {
      console.error("Story generation error:", e);
      toast({ title: "Error", description: e.message || "Failed to generate stories", variant: "destructive" });
      setState((s) => ({ ...s, isGeneratingStories: false }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { data: collection, error: collError } = await supabase
        .from("collections")
        .insert({
          name: state.name,
          season: state.season,
          user_id: user.id,
          status: "draft",
          metadata: {
            type: state.collectionType,
            palette: state.palette,
            style: state.style,
            approvedVariant: approvedVariant || null,
          },
        })
        .select()
        .single();

      if (collError) throw collError;

      // Save designs + collection items
      for (let i = 0; i < state.skus.length; i++) {
        const sku = state.skus[i];
        const { data: design, error: designErr } = await supabase
          .from("designs")
          .insert({
            title: sku.name,
            user_id: user.id,
            mode: sku.type === "quiet" ? "quiet" : "funny",
            print_type: sku.style,
            status: "draft",
            metadata: { palette: sku.palette },
          })
          .select()
          .single();

        if (designErr) throw designErr;

        await supabase.from("collection_items").insert({
          collection_id: collection.id,
          design_id: design.id,
          position: i,
          cost: sku.baseCost,
          retail_price: sku.retailPrice,
          margin: sku.marginPct,
          personalization: sku.personalization,
          sku: `${state.name.slice(0, 3).toUpperCase()}-${sku.type[0].toUpperCase()}${i + 1}`,
        });

        // Save story if exists
        if (sku.story) {
          await supabase.from("stories").insert({
            design_id: design.id,
            collection_id: collection.id,
            mythology: sku.story.mythology,
            punchlines: sku.story.punchlines,
            shopify_description: sku.story.shopifyDescription,
            tiktok_caption: sku.story.tiktokCaption,
            instagram_caption: sku.story.instagramCaption,
            hero_image_brief: sku.story.heroImageBrief,
            status: "draft",
          });
        }
      }

      toast({ title: "Collection saved", description: `${state.name} with ${state.skus.length} SKUs` });
      navigate("/collections");
    } catch (e: any) {
      console.error("Save error:", e);
      toast({ title: "Error saving", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Collection Builder
            </h1>
            <span className="text-xs font-body text-muted-foreground">
              Step {state.step + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={((state.step + 1) / STEPS.length) * 100} className="h-1" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`text-[10px] font-body uppercase tracking-wider ${
                  i <= state.step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[500px]">
          {state.step === 0 && (
            <WizardStepType
              selected={state.collectionType}
              onSelect={(t) => setState((s) => ({ ...s, collectionType: t }))}
            />
          )}
          {state.step === 1 && state.collectionType && (
            <WizardStepConfig
              collectionType={state.collectionType}
              name={state.name}
              season={state.season}
              palette={state.palette}
              style={state.style}
              onNameChange={(v) => setState((s) => ({ ...s, name: v }))}
              onSeasonChange={(v) => setState((s) => ({ ...s, season: v }))}
              onPaletteToggle={(c) =>
                setState((s) => ({
                  ...s,
                  palette: s.palette.includes(c)
                    ? s.palette.filter((p) => p !== c)
                    : [...s.palette, c],
                }))
              }
              onStyleChange={(v) => setState((s) => ({ ...s, style: v }))}
            />
          )}
          {state.step === 2 && (
            <WizardStepSKUs skus={state.skus} onUpdateSKU={handleUpdateSKU} />
          )}
          {state.step === 3 && (
            <WizardStepStories
              skus={state.skus}
              isGenerating={state.isGeneratingStories}
              onGenerate={handleGenerateStories}
            />
          )}
          {state.step === 4 && (
            <WizardStepPreview
              name={state.name}
              season={state.season}
              skus={state.skus}
              onSave={handleSave}
              isSaving={isSaving}
              onApproveVariant={(v) => setApprovedVariant(v)}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={state.step === 0 ? () => navigate("/collections") : handleBack}
            className="font-body text-xs tracking-wider uppercase"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {state.step === 0 ? "Cancel" : "Back"}
          </Button>

          {state.step < STEPS.length - 1 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="font-body text-xs tracking-wider uppercase"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
