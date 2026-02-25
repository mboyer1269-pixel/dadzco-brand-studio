import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BookOpen, ShoppingBag, Hash } from "lucide-react";
import type { WizardSKU } from "@/lib/collection-types";

interface Props {
  skus: WizardSKU[];
  isGenerating: boolean;
  onGenerate: () => void;
}

export function WizardStepStories({ skus, isGenerating, onGenerate }: Props) {
  const hasStories = skus.some((s) => s.story);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
            Storytelling Engine
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Mythologie "Écho & Rire" · Shopify · TikTok · Instagram
          </p>
        </div>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="font-body text-xs tracking-wider uppercase"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {hasStories ? "Regenerate" : "Generate Stories"}
            </>
          )}
        </Button>
      </div>

      {!hasStories && !isGenerating && (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body">
              Click "Generate Stories" to create mythology narratives and marketing copy for each SKU.
            </p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground font-body">
              AI is crafting narratives for {skus.length} SKUs…
            </p>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Mythology · Punchlines · Shopify · TikTok · Instagram
            </p>
          </CardContent>
        </Card>
      )}

      {hasStories && (
        <div className="space-y-4">
          {skus.filter((s) => s.story).map((sku) => (
            <Card key={sku.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Badge variant={sku.type === "quiet" ? "secondary" : "outline"} className="text-[10px] font-body uppercase">
                    {sku.type}
                  </Badge>
                  <CardTitle className="text-base font-body font-medium">{sku.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mythology */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">Mythology</span>
                  </div>
                  <p className="text-sm font-body text-foreground leading-relaxed">
                    {sku.story!.mythology}
                  </p>
                </div>

                {/* Punchlines */}
                <div>
                  <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-2 block">Punchlines</span>
                  <div className="flex flex-wrap gap-2">
                    {sku.story!.punchlines.map((p, i) => (
                      <Badge key={i} variant="secondary" className="font-body text-xs">
                        "{p}"
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Platform copy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">Shopify</span>
                    </div>
                    <p className="text-xs font-body text-foreground line-clamp-4">
                      {sku.story!.shopifyDescription}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">TikTok</span>
                    </div>
                    <p className="text-xs font-body text-foreground line-clamp-4">
                      {sku.story!.tiktokCaption}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] font-body uppercase tracking-wider text-muted-foreground">Instagram</span>
                    </div>
                    <p className="text-xs font-body text-foreground line-clamp-4">
                      {sku.story!.instagramCaption}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
