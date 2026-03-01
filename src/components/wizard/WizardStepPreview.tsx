import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Save, Image as ImageIcon, Wand2, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
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
  const [generatingLabel, setGeneratingLabel] = useState<"A" | "B" | "ALL" | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B">("A");
  const [approvedVariant, setApprovedVariant] = useState<"A" | "B" | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [generationCounter, setGenerationCounter] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [skuErrors, setSkuErrors] = useState<Record<string, string>>({});
  const [showDebug, setShowDebug] = useState(false);

  const pushLog = useCallback((msg: string) => {
    setDebugLog((prev) => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 30));
  }, []);

  const totalRetail = skus.reduce((s, k) => s + k.retailPrice, 0);
  const avgMargin = skus.length > 0 ? skus.reduce((s, k) => s + k.marginPct, 0) / skus.length : 0;
  const quietCount = skus.filter((s) => s.type === "quiet").length;
  const funnyCount = skus.filter((s) => s.type === "funny").length;
  const heroCount = skus.filter((s) => s.type === "hero").length;

  const generateVariant = useCallback(async (variantLabel: "A" | "B") => {
    const placement: Placement = variantLabel === "A" ? "center" : "left_chest";
    const newVariants: PrevizVariant[] = [];

    pushLog(`Generate ${variantLabel} start (${skus.length} SKUs)`);
    setSkuErrors({});

    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];

      try {
        pushLog(`SKU ${i + 1}/${skus.length} ${sku.name}...`);
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
        pushLog(`✅ SKU ok: ${sku.name} len=${dataUrl?.length || 0}`);
      } catch (e: any) {
        const msg = e?.message ? String(e.message) : String(e);
        setSkuErrors((prev) => ({ ...prev, [sku.id]: msg }));
        pushLog(`❌ SKU fail: ${sku.name} :: ${msg}`);
      }
    }

    setVariants((prev) => [
      ...prev.filter((v) => v.variant !== variantLabel),
      ...newVariants,
    ]);
    const now = new Date().toLocaleTimeString();
    setLastGeneratedAt(now);
    setGenerationCounter((c) => c + 1);
    pushLog(`Generate ${variantLabel} done. produced=${newVariants.length}`);
  }, [skus, pushLog]);

  const handleRequestVariation = useCallback(async () => {
    if (variationsGenerated >= 2 || isGenerating) return;
    const nextVariant: "A" | "B" = variationsGenerated === 0 ? "A" : "B";
    setIsGenerating(true);
    setGeneratingLabel(nextVariant);
    await generateVariant(nextVariant);
    setVariationsGenerated((v) => v + 1);
    setSelectedVariant(nextVariant);
    setIsGenerating(false);
    setGeneratingLabel(null);
  }, [variationsGenerated, isGenerating, generateVariant]);

  const handleGenerateAll = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGeneratingLabel("ALL");
    await generateVariant("A");
    await generateVariant("B");
    setVariationsGenerated(2);
    setSelectedVariant("A");
    setIsGenerating(false);
    setGeneratingLabel(null);
  }, [isGenerating, generateVariant]);

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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
            Previz & Review
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Generate concept mockups, compare variants, then approve
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!hasAnyVariants && (
            <Button
              onClick={handleGenerateAll}
              disabled={isGenerating}
              variant="outline"
              className="font-body text-xs tracking-wider uppercase"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generating…" : "Generate Previz"}
            </Button>
          )}
          <Button
            onClick={handleRequestVariation}
            disabled={isGenerating || variationsGenerated >= 2}
            variant="outline"
            className="font-body text-xs tracking-wider uppercase"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
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

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-body uppercase tracking-wider text-muted-foreground">Previz Debug</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDebug((v) => !v)}
            className="font-body text-[10px]"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>
        {showDebug && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded border border-border bg-muted/40 p-2">
            {debugLog.length === 0 ? (
              <p className="text-[11px] text-muted-foreground font-body">No logs yet.</p>
            ) : (
              <div className="space-y-1">
                {debugLog.map((line, idx) => (
                  <p key={`${line}-${idx}`} className="text-[11px] font-mono text-foreground/90 break-words">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
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
        <div className="flex items-center gap-3 flex-wrap">
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
              {approvedVariant === "A" && <CheckCircle2 className="h-3 w-3 ml-1" />}
            </Button>
            <Button
              variant={selectedVariant === "B" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVariant("B")}
              disabled={!hasVariantB}
              className="font-body text-xs"
            >
              Variant B · Left Chest
              {approvedVariant === "B" && <CheckCircle2 className="h-3 w-3 ml-1" />}
            </Button>
          </div>
          {hasVariantA && hasVariantB && !approvedVariant && (
            <>
              <span className="text-xs text-muted-foreground font-body mx-2">→</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove("A")}
                className="font-body text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve A
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleApprove("B")}
                className="font-body text-xs"
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

      {/* Generation overlay */}
      {isGenerating && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-body text-foreground">
            Generating {generatingLabel === "ALL" ? "Variant A & B" : `Variant ${generatingLabel}`} for {skus.length} SKUs…
          </span>
        </div>
      )}

      {/* SKU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skus.map((sku) => {
          const image = getVariantImage(sku.id, selectedVariant);
          const errorMsg = skuErrors[sku.id];
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
                      <p className="text-xs text-muted-foreground font-body mb-2">
                        No mockup yet
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={hasAnyVariants ? handleRequestVariation : handleGenerateAll}
                        disabled={isGenerating || variationsGenerated >= 2}
                        className="font-body text-[10px]"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                    {image && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(image, "_blank")}
                        className="h-5 px-2 text-[9px] font-body"
                      >
                        Open
                      </Button>
                    )}
                  </div>
                  <h4 className="text-sm font-body font-medium text-foreground">{sku.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-body text-foreground font-medium">{formatCAD(sku.retailPrice, 0)}</span>
                    <span className={`text-xs font-body ${sku.marginPct >= 55 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {sku.marginPct.toFixed(1)}% margin
                    </span>
                  </div>
                  {/* Debug info */}
                  {image && (
                    <p className="text-[9px] text-muted-foreground font-body mt-1.5">
                      Gen OK · len={image.length}
                    </p>
                  )}
                  {image && lastGeneratedAt && (
                    <p className="text-[9px] text-muted-foreground font-body mt-1">
                      Gen #{generationCounter} · Variant {selectedVariant} · {lastGeneratedAt}
                    </p>
                  )}
                  {errorMsg && (
                    <p className="text-[10px] text-destructive font-body mt-1.5 break-words">
                      {errorMsg.length > 120 ? `${errorMsg.slice(0, 120)}…` : errorMsg}
                    </p>
                  )}
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
