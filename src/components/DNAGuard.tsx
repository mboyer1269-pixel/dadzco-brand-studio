import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FORBIDDEN_KEYWORDS = [
  "cartoon", "cartoonish", "cute", "kawaii", "chibi", "childish",
  "baby", "comic", "manga", "anime", "playful", "silly", "funny face",
  "emoji", "sticker", "mascot", "plush", "teddy", "bunny",
  "unicorn", "rainbow", "sparkle", "glitter", "neon",
];

const REFINED_ALTERNATIVES: Record<string, string> = {
  cartoon: "illustrated, hand-drawn editorial",
  cute: "refined, delicate, understated",
  kawaii: "minimal, clean line art",
  childish: "youthful sophistication",
  comic: "editorial illustration",
  playful: "witty, clever typography",
  silly: "elegant wit, dry humor",
  neon: "muted tones, earth palette",
  glitter: "subtle metallic accent",
  rainbow: "tonal gradient, monochrome spectrum",
  sparkle: "understated sheen",
};

interface DNAGuardProps {
  prompt: string;
  mode: "quiet" | "funny";
}

export function DNAGuard({ prompt, mode }: DNAGuardProps) {
  const [violations, setViolations] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  useEffect(() => {
    const lower = prompt.toLowerCase();
    const found = FORBIDDEN_KEYWORDS.filter((kw) => lower.includes(kw));
    setViolations(found);

    const sug: Record<string, string> = {};
    found.forEach((kw) => {
      const key = Object.keys(REFINED_ALTERNATIVES).find((k) => kw.includes(k));
      if (key) sug[kw] = REFINED_ALTERNATIVES[key];
    });
    setSuggestions(sug);
  }, [prompt]);

  const isClean = violations.length === 0;
  const modeLabel = mode === "quiet" ? "Quiet Luxury" : "Funny Premium";

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-body font-medium">
          <Shield className="h-4 w-4" />
          DNA Guard
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {modeLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isClean ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <CheckCircle className="h-3.5 w-3.5 text-foreground" />
            Prompt passes brand DNA validation
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-destructive font-body">
              <AlertTriangle className="h-3.5 w-3.5" />
              {violations.length} violation{violations.length > 1 ? "s" : ""} detected
            </div>
            {violations.map((v) => (
              <div key={v} className="bg-muted rounded-md p-2.5">
                <p className="text-xs font-body">
                  <span className="text-destructive font-medium">"{v}"</span>
                  {suggestions[v] && (
                    <span className="text-muted-foreground">
                      {" → Try: "}<span className="text-foreground italic">{suggestions[v]}</span>
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
            {mode === "quiet"
              ? "Quiet Luxury: 70% negative space · anti-kitsch · no cartoons · minimal refined typography"
              : "Funny Premium: elegant witty typography · no childish graphics · refined humor"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
