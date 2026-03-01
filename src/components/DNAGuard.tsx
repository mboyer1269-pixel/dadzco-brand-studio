import { useState, useEffect } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND_DNA } from "@/core/brand_dna";

// --- Validation types ---

export interface DNAApproved {
  status: "approved";
  dna_score: number;
}

export interface DNARejected {
  status: "rejected";
  reason: "DNA violation";
  violated_rules: string[];
}

export type DNAValidationResult = DNAApproved | DNARejected;

// --- Refined alternatives for forbidden keywords ---

const REFINED_ALTERNATIVES: Record<string, string> = {
  cartoon: "illustrated, hand-drawn editorial",
  kawaii: "minimal, clean line art",
  clipart: "custom vector illustration",
  "rainbow overload": "tonal gradient, monochrome spectrum",
  glitter: "subtle metallic accent",
  "excessive pattern density": "restrained motif, generous negative space",
};

// --- Core validation engine ---

export function validateConcept(concept: {
  prompt?: string;
  margin_pct?: number;
  negative_space_pct?: number;
  tone_keywords?: string[];
}): DNAValidationResult {
  const violated: string[] = [];

  // 1) Forbidden elements
  if (concept.prompt) {
    const lower = concept.prompt.toLowerCase();
    for (const forbidden of BRAND_DNA.forbidden_elements) {
      if (lower.includes(forbidden.toLowerCase())) {
        violated.push(`Forbidden element: "${forbidden}"`);
      }
    }
  }

  // 2) Tone constraints
  if (concept.prompt) {
    const lower = concept.prompt.toLowerCase();
    for (const avoid of BRAND_DNA.tone.avoid) {
      if (lower.includes(avoid.toLowerCase())) {
        violated.push(`Tone violation: "${avoid}"`);
      }
    }
  }
  if (concept.tone_keywords) {
    for (const kw of concept.tone_keywords) {
      for (const avoid of BRAND_DNA.tone.avoid) {
        if (kw.toLowerCase().includes(avoid.toLowerCase())) {
          violated.push(`Tone keyword violation: "${avoid}"`);
        }
      }
    }
  }

  // 3) Minimum margin constraint
  if (
    concept.margin_pct !== undefined &&
    concept.margin_pct < BRAND_DNA.financial_constraints.minimum_margin_pct
  ) {
    violated.push(
      `Margin ${concept.margin_pct}% < minimum ${BRAND_DNA.financial_constraints.minimum_margin_pct}%`
    );
  }

  // 4) Visual identity — negative space
  if (
    concept.negative_space_pct !== undefined &&
    concept.negative_space_pct < BRAND_DNA.visual_identity.negative_space_minimum
  ) {
    violated.push(
      `Negative space ${concept.negative_space_pct} < minimum ${BRAND_DNA.visual_identity.negative_space_minimum}`
    );
  }

  if (violated.length > 0) {
    return { status: "rejected", reason: "DNA violation", violated_rules: violated };
  }

  // Score: base 70, +10 if margin provided & healthy, +10 if space provided & healthy, +10 if prompt clean
  let score = 70;
  if (concept.margin_pct && concept.margin_pct >= BRAND_DNA.financial_constraints.minimum_margin_pct + 10) score += 10;
  if (concept.negative_space_pct && concept.negative_space_pct >= BRAND_DNA.visual_identity.negative_space_minimum + 0.1) score += 10;
  if (concept.prompt && concept.prompt.length > 10) score += 10;

  return { status: "approved", dna_score: Math.min(score, 100) };
}

// --- UI Component ---

interface DNAGuardProps {
  prompt: string;
  mode: "quiet" | "funny";
  margin_pct?: number;
  negative_space_pct?: number;
}

export function DNAGuard({ prompt, mode, margin_pct, negative_space_pct }: DNAGuardProps) {
  const [result, setResult] = useState<DNAValidationResult | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  useEffect(() => {
    const res = validateConcept({ prompt, margin_pct, negative_space_pct });
    setResult(res);

    if (res.status === "rejected") {
      const sug: Record<string, string> = {};
      for (const rule of res.violated_rules) {
        const match = rule.match(/Forbidden element: "(.+?)"/);
        if (match && REFINED_ALTERNATIVES[match[1]]) {
          sug[match[1]] = REFINED_ALTERNATIVES[match[1]];
        }
      }
      setSuggestions(sug);
    } else {
      setSuggestions({});
    }
  }, [prompt, margin_pct, negative_space_pct]);

  const modeLabel = mode === "quiet" ? "Quiet Luxury" : "Funny Premium";
  const isApproved = result?.status === "approved";

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
        {!result || isApproved ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <CheckCircle className="h-3.5 w-3.5 text-foreground" />
            <span>
              Prompt passes brand DNA validation
              {result?.status === "approved" && (
                <span className="ml-2 text-foreground font-medium">
                  Score: {(result as DNAApproved).dna_score}/100
                </span>
              )}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-destructive font-body">
              <AlertTriangle className="h-3.5 w-3.5" />
              {(result as DNARejected).violated_rules.length} violation
              {(result as DNARejected).violated_rules.length > 1 ? "s" : ""} — rejected
            </div>
            {(result as DNARejected).violated_rules.map((rule, i) => (
              <div key={i} className="bg-muted rounded-md p-2.5">
                <p className="text-xs font-body">
                  <span className="text-destructive font-medium">{rule}</span>
                  {Object.entries(suggestions).map(([kw, alt]) =>
                    rule.includes(kw) ? (
                      <span key={kw} className="text-muted-foreground">
                        {" → Try: "}
                        <span className="text-foreground italic">{alt}</span>
                      </span>
                    ) : null
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
            {mode === "quiet"
              ? `Quiet Luxury: ${BRAND_DNA.visual_identity.negative_space_minimum * 100}% negative space · anti-kitsch · min ${BRAND_DNA.financial_constraints.minimum_margin_pct}% margin`
              : `Funny Premium: elegant witty typography · no childish graphics · min ${BRAND_DNA.financial_constraints.minimum_margin_pct}% margin`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
