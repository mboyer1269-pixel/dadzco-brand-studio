import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Save, Image as ImageIcon } from "lucide-react";
import type { WizardSKU } from "@/lib/collection-types";
import { PRICING_CONFIG } from "@/lib/pricing";

interface Props {
  name: string;
  season: string;
  skus: WizardSKU[];
  onSave: () => void;
  isSaving: boolean;
}

export function WizardStepPreview({ name, season, skus, onSave, isSaving }: Props) {
  const totalRetail = skus.reduce((s, k) => s + k.retailPrice, 0);
  const avgMargin = skus.length > 0 ? skus.reduce((s, k) => s + k.marginPct, 0) / skus.length : 0;
  const quietCount = skus.filter((s) => s.type === "quiet").length;
  const funnyCount = skus.filter((s) => s.type === "funny").length;
  const heroCount = skus.filter((s) => s.type === "hero").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
            Collection Preview
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Review & save your capsule collection
          </p>
        </div>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="font-body text-xs tracking-wider uppercase"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving…" : "Save Collection"}
        </Button>
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
              <p className="text-lg font-display font-light text-foreground">${totalRetail.toFixed(0)}</p>
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

      {/* SKU Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skus.map((sku) => (
          <Card key={sku.id} className="border-border">
            <CardContent className="p-0">
              <div className="aspect-[3/4] bg-muted rounded-t-lg flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={sku.type === "quiet" ? "secondary" : sku.type === "hero" ? "default" : "outline"} className="text-[9px] font-body uppercase">
                    {sku.type}
                  </Badge>
                  {sku.personalization && (
                    <Badge variant="outline" className="text-[9px] font-body">+Perso</Badge>
                  )}
                </div>
                <h4 className="text-sm font-body font-medium text-foreground">{sku.name}</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-body text-foreground font-medium">${sku.retailPrice}</span>
                  <span className={`text-xs font-body ${sku.marginPct >= 55 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {sku.marginPct.toFixed(1)}% margin
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
