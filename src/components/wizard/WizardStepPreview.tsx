import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Save, Image as ImageIcon, Wand2, CheckCircle2, RotateCcw } from "lucide-react";
import type { WizardSKU } from "@/lib/collection-types";
import { formatCAD } from "@/lib/pricing";
import { composeMockup, getGarmentType, type Placement } from "@/lib/compose-mockup";

interface Props {
  name: string;
  season: string;
  skus: WizardSKU[];
  onSave: () => void;
  isSaving: boolean;
  onApproveVariant?: (variant: "A" | "B") => void;
}

interface PrevizVariant {
  skuId: string;
  variant: "A" | "B";
  dataUrl: string;
  placement: Placement;
}

export function WizardStepPreview({ name, season, skus, onSave, isSaving, onApproveVariant }: Props) {
  const [variants, setVariants] = useState<PrevizVariant[]>([]);
  const [variationsGenerated, setVariationsGenerated] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B">("A");
  const [approvedVariant, setApprovedVariant] = useState<"A" | "B" | null>(null);

  const totalRetail = skus.reduce((s, k) => s + k.retailPrice, 0);
  const avgMargin = skus.length > 0 ? skus.reduce((s, k) => s + k.marginPct, 0) / skus.length : 0;
  const quietCount = skus.filter((s) => s.type === "quiet").length;
  const funnyCount = skus.filter((s) => s.type === "funny").length;
  const heroCount = skus.filter((s) => s.type === "hero").length;

  const generateVariant = useCallback(async (variantLabel: "A" | "B") => {
    setIsGenerating(true);
    const placement: Placement = variantLabel === "A" ? "center" : "left_chest";
    const newVariants: PrevizVariant[] = [];

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const garment = getGarmentType(sku.type, i);
      const dataUrl = await composeMockup({
        garment,
        skuName: sku.name,
        skuType: sku.type,
        placement,
        palette: sku.palette,
        designImageUrl: null,
      });
      newVariants.push({ skuId: sku.id, variant: variantLabel, dataUrl, placement });
    }

    setVariants((prev) => [
      ...prev.filter((v) => v.variant !== variantLabel),
      ...newVariants,
    ]);
    setIsGenerating(false);
  }, [skus]);

  const handleRequestVariation = useCallback(async () => {
    if (variationsGenerated >= 2) return;
    const nextVariant: "A" | "B" = variationsGenerated === 0 ? "A" : "B";
    await generateVariant(nextVariant);
    setVariationsGenerated((v) => v + 1);
    setSelectedVariant(nextVariant);
  }, [variationsGenerated, generateVariant]);

  const handleGenerateAll = useCallback(async () => {
    await generateVariant("A");
    await generateVariant("B");
    setVariationsGenerated(2);
    setSelectedVariant("A");
  }, [generateVariant]);

  const handleApprove = useCallback((variant: "A" | "B") => {
    setApprovedVariant(variant);
    onApproveVariant?.(variant);
  }, [onApproveVariant]);

  const getVariantImage = (skuId: string, variant: "A" | "B"): string | null => {
    return variants.find((v) => v.skuId === skuId && v.variant === variant)?.dataUrl || null;
  };

  const hasAnyVariants = variants.length > 0;
  const hasVariantA = variants.some((v) => v.variant === "A");
  const hasVariantB = variants.some((v) => v.variant === "B");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
            Previz & Review
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Generate concept mockups, compare variants, then approve
          </p>
        </div>
        <div className="flex gap-2">
          {!hasAnyVariants && (
            <Button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              variant="outline"
              className="font-body text-xs tracking-wider uppercase"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating…" : "Generate Previz"}
            </Button>
          )}
          <Button
            onClick={handleRequestVariation}
            disabled={isGenerating || variationsGenerated >= 2}
            variant="outline"
            className="font-body text-xs tracking-wider uppercase"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating…" : `Request Variation (${variationsGenerated}/2)`}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="font-body text-xs tracking-wider uppercase"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving…" : "Save Collection"}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display text-xl font-light text-foreground">{name || "Untitled Collection"}</h3>
              <p className="text-xs text-muted-foreground font-body">{season || "No season"}</p>
            </div>
            <div className="flex gap-2">
              {quietCount > 0 && <Badge variant="secondary" className="text-[10px] font-body">{quietCount} Quiet</Badge>}
              {funnyCount > 0 && <Badge variant="outline" className="text-[10px] font-body">{funnyCount} Funny</Badge>}
              {heroCount > 0 && <Badge className="text-[10px] font-body">{heroCount} Hero</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-body">SKUs</p>
              <p className="text-lg font-display font-light text-foreground">{skus.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Total Retail</p>
              <p className="text-lg font-display font-light text-foreground">{formatCAD(totalRetail, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Avg Margin</p>
              <p className={`text-lg font-display font-light ${avgMargin >= 55 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                {avgMargin.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Stories</p>
              <p className="text-lg font-display font-light text-foreground">
                {skus.filter((s) => s.story).length}/{skus.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variant Selector */}
      {hasAnyVariants && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Viewing:</span>
          <div className="flex gap-2">
            <Button
              variant={selectedVariant === "A" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVariant("A")}
              disabled={!hasVariantA}
              className="font-body text-xs"
            >
              Variant A · Center
              {approvedVariant === "A" && <CheckCircle2 className="h-3 w-3 ml-1 text-green-400" />}
            </Button>
            <Button
              variant={selectedVariant === "B" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVariant("B")}
              disabled={!hasVariantB}
              className="font-body text-xs"
            >
              Variant B · Left Chest
              {approvedVariant === "B" && <CheckCircle2 className="h-3 w-3 ml-1 text-green-400" />}
            </Button>
          </div>
          {hasVariantA && hasVariantB && !approvedVariant && (
            <>
              <span className="text-xs text-muted-foreground font-body mx-2">→</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove("A")}
                className="font-body text-xs border-green-500/30 hover:bg-green-500/10"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve A
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove("B")}
                className="font-body text-xs border-green-500/30 hover:bg-green-500/10"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve B
              </Button>
            </>
          )}
          {approvedVariant && (
            <Badge variant="secondary" className="text-[10px] font-body ml-2">
              ✓ Direction {approvedVariant} approved
            </Badge>
          )}
        </div>
      )}

      {/* SKU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skus.map((sku) => {
          const image = getVariantImage(sku.id, selectedVariant);
          return (
            <Card key={sku.id} className="border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/5] bg-muted rounded-t-lg flex items-center justify-center relative">
                  {image ? (
                    <img
                      src={image}
                      alt={`${sku.name} - Variant ${selectedVariant}`}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-body">
                        Click "Generate Previz" or<br />"Request Variation" to create mockups
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={sku.type === "quiet" ? "secondary" : sku.type === "hero" ? "default" : "outline"} className="text-[9px] font-body uppercase">
                      {sku.type}
                    </Badge>
                    {sku.personalization && (
                      <Badge variant="outline" className="text-[9px] font-body">+Perso</Badge>
                    )}
                    {image && (
                      <Badge variant="outline" className="text-[9px] font-body text-muted-foreground">
                        {selectedVariant === "A" ? "Center" : "Left Chest"}
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-body font-medium text-foreground">{sku.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-body text-foreground font-medium">{formatCAD(sku.retailPrice, 0)}</span>
                    <span className={`text-xs font-body ${sku.marginPct >= 55 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {sku.marginPct.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export hint */}
      <Card className="border-border border-dashed">
        <CardContent className="p-6 text-center">
          <Download className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-body">
            After saving, export PNG 4500×5400px transparent · seamless tiles · Printful-ready files from the Exports page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
