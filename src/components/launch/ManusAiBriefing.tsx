import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface BriefingForm {
  objective: string;
  audience: string;
  tone: string;
}

const INITIAL_FORM: BriefingForm = {
  objective: "",
  audience: "",
  tone: "",
};

export function ManusAiBriefing() {
  const [form, setForm] = useState<BriefingForm>(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = form.objective.trim().length > 0 && !isLoading;

  const handleGenerate = async () => {
    setIsLoading(true);
    setStrategy(null);

    // Simulated API call — ready to be replaced with Manus AI fetch
    try {
      await new Promise((r) => setTimeout(r, 2400));

      const mockStrategy = `## Stratégie Marketing — ${form.objective}

**Audience cible** : ${form.audience || "Hommes 25-45, style premium casual"}
**Tonalité** : ${form.tone || "Quiet Luxury, humour subtil"}

### Phase 1 — Pré-lancement (J-14)
- Teaser campagne Instagram Stories (3 visuels Leonardo AI)
- Waitlist exclusive via landing page DADZCO
- Séquence email "Founder's Note" (3 emails)

### Phase 2 — Lancement (J-Day)
- Drop simultané Shopify + Meta Ads (Lookalike 1%)
- Contenu TikTok : Behind-the-design (format vertical, 15s)
- Push notification waitlist → lien direct produit

### Phase 3 — Post-lancement (J+7)
- Retargeting Meta (visiteurs non-acheteurs)
- UGC repost + Story highlights
- Email "Last Call" avec urgence stock limité

### Budget recommandé
| Canal | Budget | Objectif |
|---|---|---|
| Meta Ads | 500 € | Acquisition |
| Instagram Organic | 0 € | Awareness |
| Email | 0 € | Conversion |
| TikTok Organic | 0 € | Viralité |`;

      setStrategy(mockStrategy);
      toast.success("Stratégie générée avec succès");
    } catch {
      toast.error("Erreur lors de la génération. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!strategy) return;
    await navigator.clipboard.writeText(strategy);
    setCopied(true);
    toast.success("Copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-base font-light flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lavande" />
          Manus AI Briefing
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Générez votre plan marketing via intelligence artificielle
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Objectif de campagne
            </label>
            <Textarea
              placeholder="Ex: Lancer la capsule DADZCO Summer Drop avec 200 ventes en 48h"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              className="resize-none h-20 text-sm font-body bg-transparent border-border/50 focus:border-lavande/50 placeholder:text-muted-foreground/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Audience cible
            </label>
            <Textarea
              placeholder="Ex: Pères 28-45, urbains, style premium casual"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="resize-none h-14 text-sm font-body bg-transparent border-border/50 focus:border-lavande/50 placeholder:text-muted-foreground/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Tonalité de marque
            </label>
            <Textarea
              placeholder="Ex: Quiet Luxury, humour subtil, anti-kitsch"
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              className="resize-none h-14 text-sm font-body bg-transparent border-border/50 focus:border-lavande/50 placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!canSubmit}
          className="w-full bg-navy hover:bg-navy/90 text-creme font-body text-xs tracking-wide h-10"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Générer la stratégie via Manus AI
            </>
          )}
        </Button>

        {strategy && (
          <div className="relative mt-4">
            <div className="absolute top-3 right-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="bg-muted/30 rounded-lg p-5 border border-border/50">
              <div className="prose prose-sm max-w-none font-body text-foreground">
                {strategy.split("\n").map((line, i) => {
                  if (line.startsWith("## "))
                    return <h3 key={i} className="font-display text-sm font-light mt-0 mb-2 text-foreground">{line.replace("## ", "")}</h3>;
                  if (line.startsWith("### "))
                    return <h4 key={i} className="font-body text-xs font-semibold mt-4 mb-1.5 uppercase tracking-wider text-muted-foreground">{line.replace("### ", "")}</h4>;
                  if (line.startsWith("**"))
                    return <p key={i} className="text-xs mb-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />;
                  if (line.startsWith("- "))
                    return <p key={i} className="text-xs text-muted-foreground pl-3 mb-0.5">• {line.replace("- ", "")}</p>;
                  if (line.startsWith("|"))
                    return null; // skip table rows in simple render
                  if (line.trim() === "") return <div key={i} className="h-2" />;
                  return <p key={i} className="text-xs text-muted-foreground mb-1">{line}</p>;
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
