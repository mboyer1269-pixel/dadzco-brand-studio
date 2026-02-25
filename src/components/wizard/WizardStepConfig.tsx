import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PALETTE_COLORS, STYLE_OPTIONS, type CollectionType } from "@/lib/collection-types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  collectionType: CollectionType;
  name: string;
  season: string;
  palette: string[];
  style: string;
  onNameChange: (name: string) => void;
  onSeasonChange: (season: string) => void;
  onPaletteToggle: (color: string) => void;
  onStyleChange: (style: string) => void;
}

export function WizardStepConfig({
  name, season, palette, style,
  onNameChange, onSeasonChange, onPaletteToggle, onStyleChange,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
          Configure Collection
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Name, palette, and style for your capsule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
              Collection Name
            </Label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Capsule Écho Automne 2026"
              className="font-body"
            />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-3 block">
              Season
            </Label>
            <Input
              value={season}
              onChange={(e) => onSeasonChange(e.target.value)}
              placeholder="e.g. FW26, SS27"
              className="font-body"
            />
          </CardContent>
        </Card>
      </div>

      {/* Palette */}
      <Card className="border-border">
        <CardContent className="p-5">
          <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-4 block">
            Palette (select colors)
          </Label>
          <div className="flex gap-3">
            {PALETTE_COLORS.map((c) => {
              const isSelected = palette.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => onPaletteToggle(c.id)}
                  className="flex-1 text-center group"
                >
                  <div
                    className={cn(
                      "h-12 rounded-md border-2 transition-all",
                      c.className,
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    )}
                  >
                    {isSelected && (
                      <div className="h-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground drop-shadow" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body mt-1.5">{c.label}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Style */}
      <Card className="border-border">
        <CardContent className="p-5">
          <Label className="text-xs font-body uppercase tracking-wider text-muted-foreground mb-4 block">
            Print Style
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => onStyleChange(s.id)}
                className={cn(
                  "p-4 rounded-md border-2 text-left transition-all",
                  style === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-secondary"
                )}
              >
                <p className="text-sm font-body font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">{s.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
