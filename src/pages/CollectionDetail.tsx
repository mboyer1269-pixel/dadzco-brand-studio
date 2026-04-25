import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  ArrowLeft, Package, Star, ShieldCheck, Clock,
  CheckCircle2, XCircle, Minus, TrendingUp, AlertTriangle, Loader2,
  ChevronRight, ChevronLeft, QrCode, FileDown,
} from "lucide-react";
import { exportCollectionQRSheetPDF } from "@/lib/collection-qr-sheet-pdf";
import { toast } from "sonner";

type CollectionRow = Tables<"collections">;
type CollectionItem = Tables<"collection_items"> & {
  designs: Pick<Tables<"designs">, "title" | "image_url" | "status"> | null;
};
type CollectionScore = Tables<"collection_scores">;
type CollectionSeal = Tables<"collection_seals">;
type CollectionEvent = Tables<"collection_events">;
type QrCodeRow = Tables<"qr_codes">;

const SEAL_LABELS: Record<string, string> = {
  brand_dna: "Brand DNA",
  finance_gate: "Finance Gate",
  production_ready: "Production Ready",
};

const REQUIRED_SEALS = ["brand_dna", "finance_gate", "production_ready"];

// ─── Lifecycle transition map (mirrors lifecycle-gate Edge Function) ──
const VALID_TRANSITIONS: Record<string, string[]> = {
  idea: ["strategy_review"],
  strategy_review: ["mockup_stage", "idea"],
  mockup_stage: ["approved_for_production", "strategy_review"],
  approved_for_production: ["in_production", "mockup_stage"],
  in_production: ["ready_for_export", "approved_for_production"],
  ready_for_export: ["exported", "in_production"],
  exported: [],
};

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  strategy_review: "Strategy Review",
  mockup_stage: "Mockup Stage",
  approved_for_production: "Approved for Production",
  in_production: "In Production",
  ready_for_export: "Ready for Export",
  exported: "Exported",
};

interface GateResult {
  passed: boolean;
  gate: string;
  message: string;
  value?: number;
  threshold?: number;
}

function SealStatusIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 className="h-4 w-4 text-[hsl(142,60%,45%)]" />;
  if (status === "revoked") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function MarginCell({ margin }: { margin: number | null }) {
  if (margin == null) return <span className="text-muted-foreground text-xs">—</span>;
  const ok = margin >= 55;
  return (
    <span className={`text-xs font-body font-medium ${ok ? "text-[hsl(142,60%,45%)]" : "text-destructive"}`}>
      {margin.toFixed(1)}%
      {!ok && <AlertTriangle className="inline h-3 w-3 ml-1" />}
    </span>
  );
}

function formatGateThreshold(g: GateResult): string | null {
  if (g.value === undefined || g.threshold === undefined) return null;
  const isPercent = g.gate === "margin_minimum" || g.gate === "financial_margin";
  if (isPercent) return `${g.value.toFixed(1)}% / min ${g.threshold}%`;
  return `${Math.round(g.value)} / min ${g.threshold}`;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? "bg-[hsl(142,60%,45%)]" : pct >= 60 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-body">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [score, setScore] = useState<CollectionScore | null>(null);
  const [seals, setSeals] = useState<CollectionSeal[]>([]);
  const [events, setEvents] = useState<CollectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sealPending, setSealPending] = useState<Set<string>>(new Set());
  const [sealErrors, setSealErrors] = useState<Record<string, string>>({});
  const [sealDialog, setSealDialog] = useState<{
    sealType: string;
    action: "approve" | "revoke";
  } | null>(null);
  const [sealReason, setSealReason] = useState("");
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [gateResults, setGateResults] = useState<GateResult[]>([]);
  const [qrCode, setQrCode] = useState<QrCodeRow | null>(null);
  const [qrPending, setQrPending] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrSheetError, setQrSheetError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [
        { data: col },
        { data: itemRows },
        { data: scoreRows },
        { data: sealRows },
        { data: eventRows },
        { data: qrRow },
      ] = await Promise.all([
        supabase.from("collections").select("*").eq("id", id).single(),
        supabase
          .from("collection_items")
          .select("*, designs(title, image_url, status)")
          .eq("collection_id", id)
          .order("position"),
        supabase
          .from("collection_scores")
          .select("*")
          .eq("collection_id", id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("collection_seals").select("*").eq("collection_id", id),
        supabase
          .from("collection_events")
          .select("*")
          .eq("collection_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("qr_codes")
          .select("*")
          .eq("collection_id", id)
          .eq("qr_type", "collection_link")
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (!col) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCollection(col);
      setItems((itemRows || []) as CollectionItem[]);
      setScore(scoreRows?.[0] ?? null);
      setSeals(sealRows || []);
      setEvents(eventRows || []);
      setQrCode(qrRow ?? null);

      // Admin check — used only to show/hide action buttons.
      // The Edge Function enforces the real admin guard server-side.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const handleSealAction = async (
    sealType: string,
    action: "approve" | "revoke",
    reason: string,
  ) => {
    setSealPending((prev) => new Set(prev).add(sealType));
    setSealErrors((prev) => { const next = { ...prev }; delete next[sealType]; return next; });

    const { data, error } = await supabase.functions.invoke("manage-seal", {
      body: { collection_id: id, seal_type: sealType, action, reason },
    });

    if (error || data?.error) {
      const msg = data?.error ?? error?.message ?? "Action failed";
      setSealErrors((prev) => ({ ...prev, [sealType]: msg }));
      toast.error(msg);
    } else if (data?.seal) {
      // Optimistic update from the Edge Function's returned row.
      setSeals((prev) => {
        const exists = prev.some((s) => s.seal_type === sealType);
        if (exists) return prev.map((s) => (s.seal_type === sealType ? data.seal : s));
        return [...prev, data.seal];
      });
      // Authoritative refresh — seals + events (history) stay in sync with server state.
      const [sealsRefresh, eventsRefresh] = await Promise.all([
        supabase.from("collection_seals").select("*").eq("collection_id", id),
        supabase
          .from("collection_events")
          .select("*")
          .eq("collection_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (sealsRefresh.data) setSeals(sealsRefresh.data);
      if (eventsRefresh.data) setEvents(eventsRefresh.data);
      toast.success(
        `${SEAL_LABELS[sealType]} ${action === "approve" ? "approved" : "revoked"}.`,
      );
      setSealDialog(null);
      setSealReason("");
    }

    setSealPending((prev) => { const next = new Set(prev); next.delete(sealType); return next; });
  };

  const handleLifecycleTransition = async (targetStatus: string) => {
    setLifecyclePending(true);
    setLifecycleError(null);
    setGateResults([]);

    const { data, error } = await supabase.functions.invoke("lifecycle-gate", {
      body: { collectionId: id, targetStatus },
    });

    if (error) {
      setLifecycleError(error.message ?? "Transition failed");
      setLifecyclePending(false);
      return;
    }

    if (data?.error) {
      setLifecycleError(data.error);
      setLifecyclePending(false);
      return;
    }

    if (data?.allowed === false) {
      setGateResults(data.gates ?? []);
      const blocked = (data.blockedBy ?? []).map((g: GateResult) => g.message).join("; ");
      setLifecycleError(blocked || "Transition blocked by gates");
      setLifecyclePending(false);
      return;
    }

    // Success — update local state
    if (data?.newStatus && collection) {
      setCollection({ ...collection, lifecycle_status: data.newStatus });
      setGateResults(data.gates ?? []);
    }
    setLifecyclePending(false);
  };

  const handleDownloadQrSheet = () => {
    setQrSheetError(null);
    if (!collection || !qrCode) return;
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setQrSheetError("QR canvas not ready. Try again in a moment.");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      exportCollectionQRSheetPDF({
        collectionName: collection.name,
        lifecycleLabel: STATUS_LABELS[collection.lifecycle_status] ?? collection.lifecycle_status,
        targetUrl: `${window.location.origin}/collections/${id}`,
        shortCode: qrCode.short_code ?? null,
        skus: items.map((item) => ({
          sku: item.sku,
          title: item.designs?.title ?? null,
          provider: item.provider,
        })),
        qrImageDataUrl: dataUrl,
      });
    } catch (err) {
      console.error("QR sheet PDF error:", err);
      setQrSheetError("Failed to generate QR sheet PDF.");
    }
  };

  const handleGenerateQr = async () => {
    setQrPending(true);
    setQrError(null);
    const targetUrl = `${window.location.origin}/collections/${id}`;
    const { data, error } = await supabase.functions.invoke("generate-qr", {
      body: { collection_id: id, target_url: targetUrl },
    });
    if (error || data?.error) {
      setQrError(data?.error ?? error?.message ?? "Failed to generate QR");
    } else if (data?.qr_code) {
      setQrCode(data.qr_code);
    }
    setQrPending(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-72 w-full mt-6" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !collection) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto text-center py-24">
          <p className="font-display text-xl font-light text-muted-foreground">Collection not found.</p>
          <Link to="/collections">
            <Button variant="outline" className="mt-4 font-body text-xs tracking-wider uppercase">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Back to Collections
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const meta = collection.metadata as Record<string, unknown>;
  const sealMap = Object.fromEntries(seals.map((s) => [s.seal_type, s]));
  const approvedSealCount = seals.filter((s) => s.status === "approved").length;
  const allSealsApproved = approvedSealCount === 3;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            to="/collections"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-body hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Collections
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-1 text-sm text-muted-foreground font-body max-w-2xl">
                  {collection.description}
                </p>
              )}
              {meta?.tagline && (
                <p className="mt-1 text-xs text-muted-foreground font-body italic">{meta.tagline}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 mt-1 flex-wrap justify-end">
              {collection.season && (
                <Badge variant="outline" className="text-[9px] font-body uppercase">
                  {collection.season}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[9px] font-body uppercase">
                {collection.lifecycle_status.replace(/_/g, " ")}
              </Badge>
              {collection.margin_validated && (
                <Badge className="text-[9px] font-body uppercase bg-[hsl(142,60%,45%)]/15 text-[hsl(142,60%,45%)] border-[hsl(142,60%,45%)]/20">
                  Margin OK
                </Badge>
              )}
            </div>
          </div>

          {/* Palette swatches */}
          {meta?.palette?.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              {meta.palette.map((color: string, i: number) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          {/* Summary strip */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <ShieldCheck
              className={`h-4 w-4 ${allSealsApproved ? "text-[hsl(142,60%,45%)]" : "text-muted-foreground"}`}
            />
            <span className="text-xs font-body text-muted-foreground">
              {allSealsApproved ? "All 3 seals approved" : `${approvedSealCount}/3 seals approved`}
            </span>
            <Separator orientation="vertical" className="h-3" />
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-body text-muted-foreground">{items.length} SKUs</span>
            {score && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <Star className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-body text-muted-foreground">Score {score.final_score}/100</span>
              </>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <Tabs defaultValue="skus">
          <TabsList className="mb-4">
            <TabsTrigger value="skus" className="font-body text-xs">
              SKUs ({items.length})
            </TabsTrigger>
            <TabsTrigger value="score" className="font-body text-xs">
              Score{score ? ` · ${score.final_score}` : ""}
            </TabsTrigger>
            <TabsTrigger value="seals" className="font-body text-xs">
              Seals · {allSealsApproved ? "✓" : `${approvedSealCount}/3`}
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="font-body text-xs">
              Lifecycle
            </TabsTrigger>
            <TabsTrigger value="events" className="font-body text-xs">
              History ({events.length})
            </TabsTrigger>
            <TabsTrigger value="qr" className="font-body text-xs">
              QR{qrCode ? " · ✓" : ""}
            </TabsTrigger>
          </TabsList>

          {/* SKUs ───────────────────────────────────────────────── */}
          <TabsContent value="skus">
            <Card className="border-border">
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-body text-muted-foreground">No SKUs in this collection yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-muted-foreground font-normal">Design</th>
                          <th className="text-left p-3 text-muted-foreground font-normal">SKU</th>
                          <th className="text-left p-3 text-muted-foreground font-normal">Provider</th>
                          <th className="text-right p-3 text-muted-foreground font-normal">Cost</th>
                          <th className="text-right p-3 text-muted-foreground font-normal">Retail</th>
                          <th className="text-right p-3 text-muted-foreground font-normal">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {item.designs?.image_url ? (
                                  <img
                                    src={item.designs.image_url}
                                    alt={item.designs.title ?? ""}
                                    className="w-8 h-8 rounded object-cover border border-border flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center flex-shrink-0">
                                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-foreground truncate max-w-[160px]">
                                  {item.designs?.title ?? "—"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground font-mono text-[10px]">
                              {item.sku ?? "—"}
                            </td>
                            <td className="p-3">
                              {item.provider ? (
                                <Badge variant="outline" className="text-[9px] capitalize">
                                  {item.provider}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {item.cost != null ? `$${item.cost.toFixed(2)}` : "—"}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {item.retail_price != null ? `$${item.retail_price.toFixed(2)}` : "—"}
                            </td>
                            <td className="p-3 text-right">
                              <MarginCell margin={item.margin} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Score ──────────────────────────────────────────────── */}
          <TabsContent value="score">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base font-light flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Collection Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!score ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-body text-muted-foreground">
                      This collection has not been scored yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <span className="font-display text-4xl font-light text-foreground">
                        {score.final_score}
                      </span>
                      <span className="text-sm text-muted-foreground font-body mb-1">/ 100</span>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <ScoreBar label="ADN Alignment" value={score.adn_alignment} />
                      <ScoreBar label="Anti-Kitsch Compliance" value={score.anti_kitsch_compliance} />
                      <ScoreBar label="Market Differentiation" value={score.market_differentiation} />
                      <ScoreBar label="Viral Potential" value={score.viral_potential} />
                      <ScoreBar label="POD Feasibility" value={score.pod_feasibility} />
                      <ScoreBar label="Margin Strength" value={score.margin_strength} />
                    </div>
                    <Separator />
                    <p className="text-[10px] text-muted-foreground font-body">
                      Scored {new Date(score.scored_at).toLocaleDateString()}
                      {score.scored_by && ` · ${score.scored_by}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seals ──────────────────────────────────────────────── */}
          <TabsContent value="seals">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base font-light flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  3 Seals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {REQUIRED_SEALS.map((sealType) => {
                  const seal = sealMap[sealType] ?? null;
                  const status = seal?.status ?? "pending";
                  const pending = sealPending.has(sealType);
                  return (
                    <div key={sealType} className="space-y-1">
                      <div className="flex items-start justify-between p-3 rounded-md border border-border bg-muted/20">
                        <div className="flex items-center gap-3">
                          <SealStatusIcon status={status} />
                          <div>
                            <p className="text-sm font-body text-foreground">
                              {SEAL_LABELS[sealType]}
                            </p>
                            {seal?.approved_at && (
                              <p className="text-[10px] text-muted-foreground font-body mt-0.5">
                                {status === "approved" ? "Approved" : "Updated"}{" "}
                                {new Date(seal.approved_at).toLocaleDateString()}
                              </p>
                            )}
                            {seal?.notes && (
                              <p className="text-[10px] text-muted-foreground font-body mt-0.5 italic">
                                {seal.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant={status === "approved" ? "outline" : "default"}
                              className="text-[10px] font-body h-7 px-2"
                              disabled={pending}
                              onClick={() =>
                                setSealDialog({
                                  sealType,
                                  action: status === "approved" ? "revoke" : "approve",
                                })
                              }
                            >
                              {pending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : status === "approved" ? (
                                "Revoke"
                              ) : (
                                "Approve"
                              )}
                            </Button>
                          )}
                          <Badge
                            variant={
                              status === "approved"
                                ? "default"
                                : status === "revoked"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[9px] font-body uppercase"
                          >
                            {status}
                          </Badge>
                        </div>
                      </div>
                      {sealErrors[sealType] && (
                        <p className="text-[10px] text-destructive font-body pl-1">
                          {sealErrors[sealType]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lifecycle ──────────────────────────────────────────── */}
          <TabsContent value="lifecycle">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base font-light flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Lifecycle Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current status */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-body">Current:</span>
                  <Badge variant="secondary" className="text-xs font-body uppercase">
                    {STATUS_LABELS[collection.lifecycle_status] ?? collection.lifecycle_status}
                  </Badge>
                </div>

                {/* Transition buttons — admin only */}
                {(() => {
                  const transitions = VALID_TRANSITIONS[collection.lifecycle_status] ?? [];
                  const nextStatus = transitions[0] ?? null;
                  const prevStatus = transitions[1] ?? null;
                  const isTerminal = transitions.length === 0;

                  if (isTerminal) {
                    return (
                      <p className="text-xs font-body text-muted-foreground italic">
                        This collection has reached its final status. No further transitions available.
                      </p>
                    );
                  }

                  if (!isAdmin) {
                    return (
                      <p className="text-xs font-body text-muted-foreground italic">
                        Only admins can advance or move back collection status.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {nextStatus && (
                          <Button
                            size="sm"
                            className="text-[10px] font-body h-8 px-3"
                            disabled={lifecyclePending}
                            onClick={() => handleLifecycleTransition(nextStatus)}
                          >
                            {lifecyclePending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            ) : (
                              <ChevronRight className="h-3 w-3 mr-1.5" />
                            )}
                            Advance to {STATUS_LABELS[nextStatus] ?? nextStatus}
                          </Button>
                        )}
                        {prevStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] font-body h-8 px-3"
                            disabled={lifecyclePending}
                            onClick={() => handleLifecycleTransition(prevStatus)}
                          >
                            {lifecyclePending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            ) : (
                              <ChevronLeft className="h-3 w-3 mr-1.5" />
                            )}
                            Move back to {STATUS_LABELS[prevStatus] ?? prevStatus}
                          </Button>
                        )}
                      </div>

                      {/* Gate failure panel */}
                      {lifecycleError && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                          <p className="text-xs font-body text-destructive font-medium flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            Transition blocked
                          </p>
                          {gateResults.length > 0 ? (
                            <div className="space-y-1.5">
                              {gateResults.map((g) => {
                                const threshold = formatGateThreshold(g);
                                return (
                                  <div key={g.gate} className="flex items-start gap-2 text-[10px] font-body">
                                    {g.passed ? (
                                      <CheckCircle2 className="h-3 w-3 text-[hsl(142,60%,45%)] mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className={g.passed ? "text-muted-foreground" : "text-destructive"}>
                                      {g.message}
                                    </span>
                                    {threshold && (
                                      <span
                                        className={`ml-auto flex-shrink-0 font-mono tabular-nums px-1.5 py-0.5 rounded border ${
                                          g.passed
                                            ? "border-[hsl(142,60%,45%)]/30 bg-[hsl(142,60%,45%)]/5 text-[hsl(142,60%,45%)]"
                                            : "border-destructive/40 bg-destructive/10 text-destructive"
                                        }`}
                                      >
                                        {threshold}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] font-body text-destructive">{lifecycleError}</p>
                          )}
                        </div>
                      )}

                      {/* Success gate results (shown after a successful transition) */}
                      {!lifecycleError && gateResults.length > 0 && (
                        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1.5">
                          {gateResults.map((g) => {
                            const threshold = formatGateThreshold(g);
                            return (
                              <div key={g.gate} className="flex items-start gap-2 text-[10px] font-body">
                                <CheckCircle2 className="h-3 w-3 text-[hsl(142,60%,45%)] mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{g.message}</span>
                                {threshold && (
                                  <span className="ml-auto flex-shrink-0 font-mono tabular-nums px-1.5 py-0.5 rounded border border-[hsl(142,60%,45%)]/30 bg-[hsl(142,60%,45%)]/5 text-[hsl(142,60%,45%)]">
                                    {threshold}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR ─────────────────────────────────────────────────── */}
          <TabsContent value="qr">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base font-light flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!qrCode ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-sm font-body text-muted-foreground">
                      No QR code generated yet.
                    </p>
                    {isAdmin && (
                      <Button
                        size="sm"
                        className="text-[10px] font-body h-8 px-3"
                        disabled={qrPending}
                        onClick={handleGenerateQr}
                      >
                        {qrPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        ) : (
                          <QrCode className="h-3 w-3 mr-1.5" />
                        )}
                        Generate QR
                      </Button>
                    )}
                    {qrError && (
                      <p className="text-[10px] text-destructive font-body">{qrError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <QRCodeSVG
                      value={`${window.location.origin}/collections/${id}`}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                    />
                    {/* Hidden high-res canvas used only for PDF rasterization */}
                    <QRCodeCanvas
                      ref={qrCanvasRef}
                      value={`${window.location.origin}/collections/${id}`}
                      size={512}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                      style={{ display: "none" }}
                    />
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px] font-body font-mono uppercase">
                        {qrCode.short_code}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body text-center max-w-xs break-all">
                      {`${window.location.origin}/collections/${id}`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-body h-8 px-3"
                      onClick={handleDownloadQrSheet}
                    >
                      <FileDown className="h-3 w-3 mr-1.5" />
                      QR Sheet PDF
                    </Button>
                    {qrSheetError && (
                      <p className="text-[10px] text-destructive font-body">{qrSheetError}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events ─────────────────────────────────────────────── */}
          <TabsContent value="events">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base font-light flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lifecycle History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-body text-muted-foreground">
                      No lifecycle events recorded yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start justify-between p-2.5 rounded-md border border-border bg-muted/10"
                      >
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-body text-foreground">
                              {ev.from_status && ev.to_status
                                ? `${ev.from_status.replace(/_/g, " ")} → ${ev.to_status.replace(/_/g, " ")}`
                                : ev.event_type}
                            </p>
                            {ev.forced && (
                              <Badge variant="destructive" className="text-[9px] font-body mt-1">
                                Forced
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-body flex-shrink-0 ml-4">
                          {new Date(ev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Seal action reason dialog (admin only) ───────────────── */}
        <Dialog
          open={sealDialog !== null}
          onOpenChange={(open) => {
            if (!open) {
              const activeSeal = sealDialog?.sealType;
              if (activeSeal && sealPending.has(activeSeal)) return;
              setSealDialog(null);
              setSealReason("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-light">
                {sealDialog?.action === "approve" ? "Approve" : "Revoke"}{" "}
                {sealDialog ? SEAL_LABELS[sealDialog.sealType] : "seal"}
              </DialogTitle>
              <DialogDescription className="text-xs font-body">
                This action is logged to the seal audit trail. A reason is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="seal-reason" className="text-xs font-body">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="seal-reason"
                value={sealReason}
                onChange={(e) => setSealReason(e.target.value)}
                placeholder="e.g. Margin verified ≥ 55% across all SKUs; brand voice check passed."
                rows={4}
                className="text-xs font-body"
              />
              {sealDialog && sealErrors[sealDialog.sealType] && (
                <p className="text-[10px] text-destructive font-body">
                  {sealErrors[sealDialog.sealType]}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSealDialog(null); setSealReason(""); }}
                disabled={sealDialog ? sealPending.has(sealDialog.sealType) : false}
                className="text-[10px] font-body"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-[10px] font-body"
                disabled={
                  !sealReason.trim() ||
                  (sealDialog ? sealPending.has(sealDialog.sealType) : false)
                }
                onClick={() => {
                  if (!sealDialog) return;
                  void handleSealAction(
                    sealDialog.sealType,
                    sealDialog.action,
                    sealReason.trim(),
                  );
                }}
              >
                {sealDialog && sealPending.has(sealDialog.sealType) ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                ) : null}
                Confirm {sealDialog?.action ?? ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
};

export default CollectionDetail;
