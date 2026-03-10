import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Image, Send, Loader2, Instagram, Film, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ChannelContent {
  copy: string;
  visualReady: boolean;
  visualLoading: boolean;
}

type Channel = "instagram" | "tiktok" | "meta-ads";

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ReactNode; placeholder: string }> = {
  instagram: {
    label: "Instagram",
    icon: <Instagram className="h-3.5 w-3.5" />,
    placeholder: "Contenu Instagram généré par l'IA apparaîtra ici…",
  },
  tiktok: {
    label: "TikTok",
    icon: <Film className="h-3.5 w-3.5" />,
    placeholder: "Script TikTok généré par l'IA apparaîtra ici…",
  },
  "meta-ads": {
    label: "Meta Ads",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    placeholder: "Copy publicitaire Meta généré par l'IA apparaîtra ici…",
  },
};

const MOCK_COPY: Record<Channel, string> = {
  instagram: `✦ DADZCO — Summer Drop

Le style n'attend pas. La capsule été arrive.

70% negative space. 100% intention.

Pré-commande exclusive → lien en bio.

#DADZCO #QuietLuxury #FatherStyle #SummerDrop`,
  tiktok: `[HOOK — 0-3s]
"Les pères stylés ne portent pas de cargo shorts."

[REVEAL — 3-8s]
Transition vers le look DADZCO Summer Drop.
Musique : lo-fi premium, pas de voix off.

[CTA — 8-15s]
Texte overlay : "Pré-commande ouverte. Lien en bio."
Logo DADZCO en bas à droite, fondu.`,
  "meta-ads": `HEADLINE : Le style paternel, réinventé.
PRIMARY TEXT : DADZCO Summer Drop — Capsule limitée à 50 exemplaires. Design premium, coupe moderne, zéro compromis. Pré-commandez maintenant.
DESCRIPTION : Livraison gratuite · Retours 30 jours
CTA : Shop Now
AUDIENCE : Lookalike 1% — Acheteurs mode masculine 28-45
PLACEMENT : Feed + Stories + Reels`,
};

export function MetaLeonardoHub() {
  const [activeTab, setActiveTab] = useState<Channel>("instagram");
  const [content, setContent] = useState<Record<Channel, ChannelContent>>({
    instagram: { copy: "", visualReady: false, visualLoading: false },
    tiktok: { copy: "", visualReady: false, visualLoading: false },
    "meta-ads": { copy: "", visualReady: false, visualLoading: false },
  });
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);

  const currentContent = content[activeTab];
  const hasCopy = currentContent.copy.trim().length > 0;

  const handleGenerateCopy = async () => {
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      setContent((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], copy: MOCK_COPY[activeTab] },
      }));
      toast.success(`Copy ${CHANNEL_CONFIG[activeTab].label} généré`);

      // Simulate Leonardo visual generation
      setContent((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], visualLoading: true },
      }));
      await new Promise((r) => setTimeout(r, 2200));
      setContent((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], visualLoading: false, visualReady: true },
      }));
      toast.success("Visuel Leonardo AI généré");
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setGenerating(false);
    }
  };

  const handlePushToMeta = async () => {
    setPushing(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      toast.success("Contenu envoyé à Meta Business Suite");
    } catch {
      toast.error("Erreur de synchronisation Meta");
    } finally {
      setPushing(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-base font-light flex items-center gap-2">
          <Image className="h-4 w-4 text-lavande" />
          Meta & Leonardo Hub
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Génération de contenu et visuels par canal
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Channel)}>
          <TabsList className="w-full bg-muted/30 border border-border/50 h-9">
            {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
              <TabsTrigger
                key={ch}
                value={ch}
                className="flex-1 text-[10px] font-body uppercase tracking-wider gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {CHANNEL_CONFIG[ch].icon}
                {CHANNEL_CONFIG[ch].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
            <TabsContent key={ch} value={ch} className="mt-4 space-y-4">
              {/* Generated Copy */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
                    Copy généré
                  </label>
                  {content[ch].copy && (
                    <Badge variant="outline" className="text-[8px] border-lavande/30 text-lavande">
                      Éditable
                    </Badge>
                  )}
                </div>
                <Textarea
                  placeholder={CHANNEL_CONFIG[ch].placeholder}
                  value={content[ch].copy}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev,
                      [ch]: { ...prev[ch], copy: e.target.value },
                    }))
                  }
                  className="resize-none h-36 text-xs font-body bg-transparent border-border/50 focus:border-lavande/50 placeholder:text-muted-foreground/30 leading-relaxed"
                />
              </div>

              {/* Leonardo Visual Zone */}
              <div>
                <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Visuel Leonardo AI
                </label>
                <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                  {content[ch].visualLoading ? (
                    <div className="p-6 space-y-3">
                      <Skeleton className="h-32 w-full rounded-md" />
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                    </div>
                  ) : content[ch].visualReady ? (
                    <div className="p-4">
                      <div className="h-36 rounded-md bg-gradient-to-br from-navy/10 via-sable/20 to-lavande/10 flex items-center justify-center border border-border/30">
                        <div className="text-center">
                          <Image className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-[10px] font-body text-muted-foreground">
                            Visuel généré — 1080×1080
                          </p>
                          <Badge variant="outline" className="mt-2 text-[8px]">Leonardo AI</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Image className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-[10px] font-body text-muted-foreground/50">
                        Générez le copy pour déclencher la création visuelle
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateCopy}
                  disabled={generating}
                  variant="outline"
                  className="flex-1 text-xs font-body h-9 border-border/50"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  )}
                  {generating ? "Génération…" : "Générer le contenu"}
                </Button>
                <Button
                  onClick={handlePushToMeta}
                  disabled={!hasCopy || pushing}
                  className="flex-1 text-xs font-body h-9 bg-navy hover:bg-navy/90 text-creme"
                >
                  {pushing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-2" />
                  )}
                  Push to Meta
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
