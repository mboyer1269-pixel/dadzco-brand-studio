import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { WizardSKU } from "@/lib/collection-types";
import { calculateSKUPricing, PRICING_CONFIG, formatCAD } from "@/lib/pricing";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

interface Props {
  skus: WizardSKU[];
  onUpdateSKU: (index: number, updates: Partial<WizardSKU>) => void;
}

export function WizardStepSKUs({ skus, onUpdateSKU }: Props) {
  const totalRetail = skus.reduce((s, k) => s + k.retailPrice, 0);
  const avgMargin = skus.length > 0
    ? skus.reduce((s, k) => s + k.marginPct, 0) / skus.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
            SKU Pricing & Margins
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Input Printful costs · auto-calculate with {PRICING_CONFIG.returnBuffer * 100}% buffer · target {PRICING_CONFIG.targetMargin * 100}% margin
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Avg Margin</p>
          <p className={`text-xl font-display font-light ${avgMargin >= 55 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {skus.map((sku, idx) => {
          const pricing = calculateSKUPricing(sku.baseCost, sku.retailPrice > 0 ? sku.retailPrice : undefined);
          const marginOk = pricing.marginPct >= 55;

          return (
            <Card key={sku.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={sku.type === "quiet" ? "secondary" : sku.type === "hero" ? "default" : "outline"} className="text-[10px] font-body uppercase">
                      {sku.type}
                    </Badge>
                    <CardTitle className="text-base font-body font-medium">{sku.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {!marginOk && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    <span className={`text-sm font-body font-medium ${marginOk ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {pricing.marginPct}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Base Cost (CAD)
                    </Label>
                    <Input
                      type="number"
                      value={sku.baseCost || ""}
                      onChange={(e) => {
                        const cost = parseFloat(e.target.value) || 0;
                        const p = calculateSKUPricing(cost);
                        onUpdateSKU(idx, {
                          baseCost: cost,
                          retailPrice: p.suggestedRetail,
                          margin: p.margin,
                          marginPct: p.marginPct,
                        });
                      }}
                      placeholder="0.00"
                      className="font-body text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Buffered Cost
                    </Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                      <span className="text-sm font-body text-foreground">{formatCAD(pricing.bufferedCost)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Retail Price (CAD)
                    </Label>
                    <Input
                      type="number"
                      value={sku.retailPrice || ""}
                      onChange={(e) => {
                        const retail = parseFloat(e.target.value) || 0;
                        const p = calculateSKUPricing(sku.baseCost, retail);
                        onUpdateSKU(idx, {
                          retailPrice: retail,
                          margin: p.margin,
                          marginPct: p.marginPct,
                        });
                      }}
                      placeholder="0.00"
                      className="font-body text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Margin (CAD)
                    </Label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                      <span className="text-sm font-body text-foreground">{formatCAD(pricing.margin)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Personalization
                    </Label>
                    <div className="h-10 flex items-center gap-2">
                      <Switch
                        checked={sku.personalization}
                        onCheckedChange={(v) => onUpdateSKU(idx, { personalization: v })}
                      />
                      <span className="text-xs font-body text-muted-foreground">+{formatCAD(PRICING_CONFIG.personalizationAddon, 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bundle Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-body uppercase tracking-wider text-primary font-medium">Pricing Summary</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
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
              <p className="text-xs text-muted-foreground font-body">Bundle +Perso</p>
              <p className="text-lg font-display font-light text-foreground">
                {formatCAD(totalRetail + PRICING_CONFIG.personalizationAddon, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
