import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileText, Palette, Shield, CheckCircle2, AlertTriangle, BookOpen, Lock, Eye } from "lucide-react";

const BRAND_DNA = {
  quiet: {
    label: "Quiet Luxury",
    rules: [
      "70% negative space minimum",
      "Anti-kitsch : aucun cartoon, aucune illustration enfantine",
      "Palette verrouillée : Sable, Brume, Navy, Crème, Lavande",
      "Typographie Cormorant Garamond + Inter uniquement",
      "Écho géométrique, motifs ton-sur-ton",
    ],
  },
  funny: {
    label: "Funny Premium",
    rules: [
      "Typographie élégante uniquement (pas de BD/cartoon)",
      "Humour premium : subtil, witty, jamais vulgaire",
      "Pas de graphisme enfantin ou kitsch",
      "Même palette brand que Quiet Luxury",
      "Punchlines en anglais, esprit corporate détourné",
    ],
  },
  cash: {
    label: "Cash Retention",
    rules: [
      "CAC cible < 25€ (alerte si dépassé)",
      "Repeat purchase rate tracking obligatoire",
      "Hero Buzz limité à 50 exemplaires",
      "Gate cash : marge minimum 55% sur chaque SKU",
      "Pré-lancement : waitlist obligatoire avant drop",
    ],
  },
};

const FORBIDDEN_KEYWORDS = ["cartoon", "cute", "childish", "kawaii", "comic", "clipart", "mignon", "enfantin"];

interface UploadedFile {
  name: string;
  type: "pdf" | "logo";
  size: string;
  uploadedAt: string;
}

export default function BrandBook() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: "DADZCO_BrandBook_v3.pdf", type: "pdf", size: "4.2 MB", uploadedAt: "2026-02-20" },
    { name: "dadzco-logo-dark.svg", type: "logo", size: "12 KB", uploadedAt: "2026-02-20" },
  ]);
  const [dnaLocked, setDnaLocked] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"quiet" | "funny" | "cash">("quiet");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // In production, this would upload to storage
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          type: ext === "pdf" ? "pdf" : "logo",
          size: `${(file.size / 1024).toFixed(1)} KB`,
          uploadedAt: new Date().toISOString().split("T")[0],
        },
      ]);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 md:p-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Brand Book Hub
            </h1>
          </div>
          <p className="text-sm font-body text-muted-foreground max-w-lg">
            Upload your Brand Book PDF and logos. L'ADN est auto-extrait et verrouillé pour garantir la cohérence de chaque design.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="card-lift">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-body font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  Upload Zone
                </CardTitle>
                <CardDescription className="text-xs">PDF, SVG, PNG — max 20 MB</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                    dragOver
                      ? "border-accent bg-accent/10 glow-lavande"
                      : "border-border hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <div className="echo-motif mb-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  </div>
                  <p className="text-xs font-body text-muted-foreground mb-1">
                    Glissez vos fichiers ici
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground/60">
                    ou cliquez pour parcourir
                  </p>
                </div>

                {/* Uploaded files */}
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-body font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{file.size} · {file.uploadedAt}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {file.type.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* DNA Lock Status */}
            <Card className="card-lift border-accent/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {dnaLocked ? (
                      <Lock className="h-4 w-4 text-accent" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-xs font-body font-medium">ADN Status</span>
                  </div>
                  <Badge
                    variant={dnaLocked ? "default" : "destructive"}
                    className="text-[9px]"
                  >
                    {dnaLocked ? "VERROUILLÉ" : "DÉVERROUILLÉ"}
                  </Badge>
                </div>
                <Progress value={dnaLocked ? 100 : 60} className="h-1.5 mb-2" />
                <p className="text-[10px] text-muted-foreground font-body">
                  {dnaLocked
                    ? "L'ADN brand est actif. Tous les designs sont validés automatiquement."
                    : "Attention : l'ADN n'est pas verrouillé. Les designs pourraient dévier."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* DNA Rules */}
          <div className="lg:col-span-2">
            <Card className="card-lift">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-body font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    ADN Brand — Règles extraites
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Prévisualiser les règles actives</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tabs */}
                <div className="flex gap-1 mb-5 p-1 bg-muted/50 rounded-md">
                  {(Object.keys(BRAND_DNA) as Array<keyof typeof BRAND_DNA>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 text-[10px] font-body uppercase tracking-wider py-2 px-3 rounded transition-all duration-200 ${
                        activeTab === key
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {BRAND_DNA[key].label}
                    </button>
                  ))}
                </div>

                {/* Rules list */}
                <div className="space-y-3">
                  {BRAND_DNA[activeTab].rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs font-body text-foreground/90 leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>

                {/* Forbidden keywords */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3">
                    Mots-clés interdits — DNA Guard
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FORBIDDEN_KEYWORDS.map((kw) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="text-[9px] border-destructive/30 text-destructive/70"
                      >
                        🚫 {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Palette preview */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3">
                    Palette verrouillée
                  </p>
                  <div className="flex gap-2">
                    {[
                      { name: "Sable", color: "bg-sable" },
                      { name: "Brume", color: "bg-brume" },
                      { name: "Navy", color: "bg-navy" },
                      { name: "Crème", color: "bg-creme" },
                      { name: "Lavande", color: "bg-lavande" },
                    ].map((c) => (
                      <Tooltip key={c.name}>
                        <TooltipTrigger>
                          <div
                            className={`h-10 w-10 rounded-md ${c.color} border border-border transition-transform hover:scale-110`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{c.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
