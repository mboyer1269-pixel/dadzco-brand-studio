import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, FileText, Palette, Shield, CheckCircle2, AlertTriangle, BookOpen, Lock, Eye, Trash2, Loader2, Sparkles, Type, Ban } from "lucide-react";
import { FileThumbnail, FilePreviewButton } from "@/components/brand/FilePreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fallback static DNA rules (used when no AI extraction exists)
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

interface BrandFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

interface ExtractedRule {
  rule: string;
  category: string;
  priority: string;
}

interface PaletteColor {
  name: string;
  hex: string;
  usage?: string;
}

interface TypographyEntry {
  font: string;
  weight?: string;
  usage?: string;
}

interface BrandRules {
  id: string;
  brand_file_id: string;
  category: string;
  rules: ExtractedRule[];
  palette: PaletteColor[];
  forbidden_keywords: string[];
  typography: TypographyEntry[];
  raw_summary: string | null;
}

const ACCEPTED_TYPES = ["application/pdf", "image/svg+xml", "image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  return "logo";
}

export default function BrandBook() {
  const [files, setFiles] = useState<BrandFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dnaLocked, setDnaLocked] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"quiet" | "funny" | "cash" | "ai">("ai");
  const [extractedRules, setExtractedRules] = useState<BrandRules[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("brand_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFiles((data as BrandFile[]) || []);
    } catch {
      // silently fail on load
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExtractedRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("brand_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rules = (data || []) as unknown as BrandRules[];
      setExtractedRules(rules);
      setDnaLocked(rules.length > 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchExtractedRules();
  }, [fetchFiles, fetchExtractedRules]);

  const extractBrandRules = async (file: BrandFile) => {
    setExtracting(file.id);
    try {
      const { data, error } = await supabase.functions.invoke("extract-brand-rules", {
        body: {
          brandFileId: file.id,
          storagePath: file.storage_path,
          fileName: file.file_name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Règles extraites de "${file.file_name}" avec succès !`);
      await fetchExtractedRules();
    } catch (e: any) {
      console.error("Extraction error:", e);
      toast.error(e.message || "Erreur lors de l'extraction des règles.");
    } finally {
      setExtracting(null);
    }
  };

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PDF, SVG, PNG, JPG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (max 20 MB).");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non authentifié."); return; }

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-book-files")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: dbData, error: dbError } = await supabase.from("brand_files").insert({
        user_id: user.id,
        file_name: file.name.slice(0, 255),
        file_type: getFileType(file.name),
        file_size: file.size,
        storage_path: storagePath,
      }).select().single();
      if (dbError) throw dbError;

      toast.success(`"${file.name}" uploadé. Extraction IA en cours…`);
      await fetchFiles();

      // Auto-trigger AI extraction
      if (dbData) {
        extractBrandRules(dbData as BrandFile);
      }
    } catch (e: any) {
      console.error("Upload error:", e);
      toast.error(e.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (f: BrandFile) => {
    try {
      await supabase.storage.from("brand-book-files").remove([f.storage_path]);
      await supabase.from("brand_files").delete().eq("id", f.id);
      toast.success(`"${f.file_name}" supprimé.`);
      await fetchFiles();
      await fetchExtractedRules();
    } catch {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Merge all extracted rules
  const allRules = extractedRules.flatMap((r) => r.rules || []);
  const allPalette = extractedRules.flatMap((r) => r.palette || []);
  const allTypography = extractedRules.flatMap((r) => r.typography || []);
  const allForbidden = [
    ...new Set([
      ...FORBIDDEN_KEYWORDS,
      ...extractedRules.flatMap((r) => r.forbidden_keywords || []),
    ]),
  ];
  const summaries = extractedRules.map((r) => r.raw_summary).filter(Boolean);
  const hasAiRules = extractedRules.length > 0;

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
            Upload your Brand Book PDF and logos. L'IA extrait automatiquement votre ADN brand et verrouille les règles.
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
                <CardDescription className="text-xs">PDF, SVG, PNG — max 20 MB · Auto-extraction IA</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.svg,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                    dragOver
                      ? "border-accent bg-accent/10 glow-lavande"
                      : "border-border hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <div className="echo-motif mb-4">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 mx-auto text-accent animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs font-body text-muted-foreground mb-1">
                    {uploading ? "Upload en cours…" : "Glissez vos fichiers ici"}
                  </p>
                  <p className="text-[10px] font-body text-muted-foreground/60">
                    ou cliquez pour parcourir
                  </p>
                </div>

                {/* Uploaded files */}
                <div className="mt-4 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : files.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-3 font-body">
                      Aucun fichier uploadé
                    </p>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <FileThumbnail fileName={file.file_name} storagePath={file.storage_path} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body font-medium truncate">{file.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(file.file_size)} · {file.created_at.split("T")[0]}
                          </p>
                        </div>
                        <FilePreviewButton
                          fileName={file.file_name}
                          storagePath={file.storage_path}
                          fileType={file.file_type}
                        />
                        {extracting === file.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-accent/70 hover:text-accent"
                                onClick={(e) => { e.stopPropagation(); extractBrandRules(file); }}
                              >
                                <Sparkles className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Re-extraire les règles IA</p></TooltipContent>
                          </Tooltip>
                        )}
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {file.file_type.toUpperCase()}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteFile(file); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* DNA Lock Status */}
            <Card className={`card-lift ${dnaLocked ? "border-accent/30" : "border-destructive/30"}`}>
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
                  <Badge variant={dnaLocked ? "default" : "destructive"} className="text-[9px]">
                    {dnaLocked ? "VERROUILLÉ IA" : "EN ATTENTE"}
                  </Badge>
                </div>
                <Progress value={dnaLocked ? 100 : 20} className="h-1.5 mb-2" />
                <p className="text-[10px] text-muted-foreground font-body">
                  {dnaLocked
                    ? `${extractedRules.length} fichier(s) analysé(s). ADN auto-extrait et verrouillé.`
                    : "Uploadez un Brand Book PDF pour activer l'extraction IA automatique."}
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
                    ADN Brand — Règles {hasAiRules ? "auto-extraites IA" : "par défaut"}
                  </CardTitle>
                  {hasAiRules && (
                    <Badge className="text-[9px] bg-accent/20 text-accent border-accent/30">
                      <Sparkles className="h-2.5 w-2.5 mr-1" />
                      IA
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Tabs */}
                <div className="flex gap-1 mb-5 p-1 bg-muted/50 rounded-md">
                  {hasAiRules && (
                    <button
                      onClick={() => setActiveTab("ai")}
                      className={`flex-1 text-[10px] font-body uppercase tracking-wider py-2 px-3 rounded transition-all duration-200 flex items-center justify-center gap-1 ${
                        activeTab === "ai"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      Extrait IA
                    </button>
                  )}
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

                {/* AI Extracted Rules */}
                {activeTab === "ai" && hasAiRules && (
                  <div className="space-y-5">
                    {/* Summary */}
                    {summaries.length > 0 && (
                      <div className="p-3 rounded-md bg-accent/5 border border-accent/20">
                        <p className="text-xs font-body text-foreground/80 leading-relaxed italic">
                          {summaries[0]}
                        </p>
                      </div>
                    )}

                    {/* Extracted Rules */}
                    <div>
                      <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3">
                        Règles extraites ({allRules.length})
                      </p>
                      <div className="space-y-2">
                        {allRules.map((rule, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                rule.priority === "critical"
                                  ? "text-destructive"
                                  : rule.priority === "important"
                                  ? "text-accent"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-body text-foreground/90 leading-relaxed">{rule.rule}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Badge variant="outline" className="text-[8px]">
                                {rule.category}
                              </Badge>
                              {rule.priority === "critical" && (
                                <Badge variant="destructive" className="text-[8px]">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Extracted Palette */}
                    {allPalette.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          Palette extraite
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {allPalette.map((c, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger>
                                <div className="flex items-center gap-2 p-1.5 pr-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div
                                    className="h-8 w-8 rounded-md border border-border"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <div className="text-left">
                                    <p className="text-[10px] font-body font-medium">{c.name}</p>
                                    <p className="text-[9px] text-muted-foreground font-mono">{c.hex}</p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{c.usage || c.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Typography */}
                    {allTypography.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                          <Type className="h-3 w-3" />
                          Typographie
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {allTypography.map((t, i) => (
                            <div key={i} className="p-2 rounded-md bg-muted/30">
                              <p className="text-xs font-body font-medium">{t.font}</p>
                              {t.weight && <p className="text-[9px] text-muted-foreground">{t.weight}</p>}
                              {t.usage && <p className="text-[9px] text-muted-foreground">{t.usage}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Static rules for quiet/funny/cash tabs */}
                {activeTab !== "ai" && (
                  <div className="space-y-3">
                    {BRAND_DNA[activeTab as keyof typeof BRAND_DNA].rules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs font-body text-foreground/90 leading-relaxed">{rule}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Forbidden keywords */}
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-[10px] font-body uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
                    <Ban className="h-3 w-3" />
                    Mots-clés interdits — DNA Guard
                    {hasAiRules && (
                      <Badge className="text-[8px] ml-1 bg-accent/10 text-accent">+ IA</Badge>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allForbidden.map((kw) => (
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

                {/* Palette preview (static fallback) */}
                {activeTab !== "ai" && (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
