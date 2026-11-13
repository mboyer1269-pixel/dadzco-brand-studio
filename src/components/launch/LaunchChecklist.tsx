import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// Items 0-2 are system-derived gates (never stored in planner_tasks)
// Items 3-11 are manual persisted tasks
const SEED_ITEMS: string[] = [
  "3 seals approved",
  "Avg margin ≥ 55% confirmed",
  "Final score ≥ 80 and ADN ≥ 80 confirmed",
  "Brand rules locked",
  "Export Pack generated and reviewed",
  "QR sheet generated and reviewed",
  "Production files uploaded",
  "Product imagery approved",
  "Launch copy approved",
  "Metadata and product details reviewed",
  "Fulfilment readiness confirmed",
  "Customer service readiness confirmed",
];

const SYSTEM_GATE_TITLES = new Set(SEED_ITEMS.slice(0, 3));
const MANUAL_SEED_ITEMS = SEED_ITEMS.slice(3);
const REQUIRED_SEALS = ["brand_dna", "finance_gate", "production_ready"] as const;

const ORDER: Record<string, number> = SEED_ITEMS.reduce(
  (acc, title, idx) => ({ ...acc, [title]: idx }),
  {} as Record<string, number>,
);

const LAUNCH_CATEGORY = "launch";

interface LaunchTask {
  id: string;
  title: string;
  status: string;
}

// "error" means the gate could not be evaluated (query failure) — distinct from
// "fail", which means the data was read successfully and the gate is not met.
type GateStatus = "pass" | "fail" | "pending" | "error";

interface GateState {
  seals: GateStatus;
  margin: GateStatus;
  score: GateStatus;
  loading: boolean;
  error: string | null;
}

const INITIAL_GATES: GateState = {
  seals: "pending",
  margin: "pending",
  score: "pending",
  loading: false,
  error: null,
};

const gatesErrorState = (message: string): GateState => ({
  seals: "error",
  margin: "error",
  score: "error",
  loading: false,
  error: message,
});

interface Props {
  collectionId?: string;
}

export function LaunchChecklist({ collectionId }: Props) {
  const [tasks, setTasks] = useState<LaunchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [gates, setGates] = useState<GateState>(INITIAL_GATES);
  const [gatesReloadKey, setGatesReloadKey] = useState(0);
  const seedingRef = useRef(false);

  const loadAndSeed = useCallback(async () => {
    if (seedingRef.current) return;
    seedingRef.current = true;
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        return;
      }

      const { data: existing, error: fetchError } = await supabase
        .from("planner_tasks")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("category", LAUNCH_CATEGORY);

      if (fetchError) throw fetchError;

      // Strip legacy system gate rows — they are now derived, not stored
      const manualTasks = ((existing || []) as LaunchTask[]).filter(
        (t) => !SYSTEM_GATE_TITLES.has(t.title),
      );

      if (manualTasks.length > 0) {
        setTasks(manualTasks);
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const rows = MANUAL_SEED_ITEMS.map((title) => ({
        user_id: user.id,
        title,
        date: today,
        priority: "medium",
        status: "todo",
        category: LAUNCH_CATEGORY,
        cash_alert: false,
      }));

      const { error: insertError } = await supabase.from("planner_tasks").insert(rows);
      if (insertError) throw insertError;

      const { data: seeded, error: refetchError } = await supabase
        .from("planner_tasks")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("category", LAUNCH_CATEGORY);
      if (refetchError) throw refetchError;

      setTasks(
        ((seeded || []) as LaunchTask[]).filter((t) => !SYSTEM_GATE_TITLES.has(t.title)),
      );
    } catch (err) {
      console.error("Launch checklist load error:", err);
      toast.error("Impossible de charger la checklist de lancement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAndSeed();
  }, [loadAndSeed]);

  useEffect(() => {
    if (!collectionId) {
      setGates(INITIAL_GATES);
      return;
    }

    let cancelled = false;
    setGates({ seals: "pending", margin: "pending", score: "pending", loading: true, error: null });

    const fetchGates = async () => {
      try {
        const [sealsResult, itemsResult, scoreResult] = await Promise.all([
          supabase
            .from("collection_seals")
            .select("seal_type, status")
            .eq("collection_id", collectionId)
            .in("seal_type", [...REQUIRED_SEALS])
            .eq("status", "approved"),
          supabase
            .from("collection_items")
            .select("margin")
            .eq("collection_id", collectionId),
          supabase
            .from("collection_scores")
            .select("final_score, adn_alignment")
            .eq("collection_id", collectionId)
            .order("scored_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        // Supabase returns query failures in `.error` instead of throwing.
        // Never derive gate verdicts from a failed read: that would show a
        // false "GATES BLOQUÉS" for a collection that may actually pass.
        const queryError = sealsResult.error ?? itemsResult.error ?? scoreResult.error;
        if (queryError) {
          console.error("Gate query error:", queryError);
          setGates(gatesErrorState(queryError.message));
          toast.error("Impossible de vérifier les portes système.");
          return;
        }

        const approvedTypes = new Set((sealsResult.data || []).map((s) => s.seal_type));
        const gate1: GateStatus = REQUIRED_SEALS.every((t) => approvedTypes.has(t))
          ? "pass"
          : "fail";

        const margins = ((itemsResult.data || []) as { margin: number | null }[])
          .map((i) => i.margin)
          .filter((m): m is number => typeof m === "number" && isFinite(m));
        const avgMargin =
          margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
        const gate2: GateStatus = margins.length > 0 && avgMargin >= 55 ? "pass" : "fail";

        const score = scoreResult.data;
        const gate3: GateStatus =
          score && score.final_score >= 80 && score.adn_alignment >= 80 ? "pass" : "fail";

        setGates({ seals: gate1, margin: gate2, score: gate3, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          console.error("Gate fetch error:", err);
          const message =
            typeof (err as { message?: unknown })?.message === "string"
              ? (err as { message: string }).message
              : "Erreur inconnue";
          setGates(gatesErrorState(message));
          toast.error("Impossible de vérifier les portes système.");
        }
      }
    };

    fetchGates();
    return () => {
      cancelled = true;
    };
  }, [collectionId, gatesReloadKey]);

  const sorted = [...tasks].sort(
    (a, b) => (ORDER[a.title] ?? 999) - (ORDER[b.title] ?? 999),
  );

  const gateStatuses: GateStatus[] = [gates.seals, gates.margin, gates.score];
  const gatesPassed = gateStatuses.filter((s) => s === "pass").length;
  const manualDone = sorted.filter((t) => t.status === "done").length;
  const manualTotal = sorted.length;
  const total = 3 + manualTotal;
  const checkedCount = gatesPassed + manualDone;
  const allGatesPass = !gates.loading && gateStatuses.every((s) => s === "pass");
  const allManualDone = !loading && manualTotal > 0 && sorted.every((t) => t.status === "done");
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const gatesErrored = Boolean(collectionId) && !gates.loading && gates.error !== null;
  const gatesBlocked =
    Boolean(collectionId) && !gates.loading && !gatesErrored && gateStatuses.some((s) => s === "fail");

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));

    const { error } = await supabase
      .from("planner_tasks")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
      toast.error("Impossible de mettre à jour la tâche.");
    }
  };

  const getStatusLabel = () => {
    if (!loading && manualTotal === 0) return "VIDE";
    if (allGatesPass && allManualDone) return "GO LIVE";
    if (gatesErrored) return "VÉRIFICATION IMPOSSIBLE";
    if (gatesBlocked) return "GATES BLOQUÉS";
    if (progress >= 60) return "PRESQUE PRÊT";
    if (progress > 0) return "EN COURS";
    return "EN ATTENTE";
  };

  const getStatusColor = () => {
    if (allGatesPass && allManualDone)
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (gatesErrored) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    if (gatesBlocked) return "bg-red-500/10 text-red-600 border-red-500/30";
    if (progress >= 60) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const gateConfig = [
    {
      key: "seals" as const,
      title: "3 seals approved",
      passLabel: "Approuvé",
      failLabel: "Manquant",
    },
    {
      key: "margin" as const,
      title: "Avg margin ≥ 55% confirmed",
      passLabel: "Passé",
      failLabel: "Insuffisant",
    },
    {
      key: "score" as const,
      title: "Final score ≥ 80 and ADN ≥ 80 confirmed",
      passLabel: "Passé",
      failLabel: "Insuffisant",
    },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base font-light flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-lavande" />
              Launch Checklist
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Checklist de pré-lancement — persistée
            </p>
          </div>
          <Badge variant="outline" className={`text-[9px] font-body ${getStatusColor()}`}>
            {getStatusLabel()}
          </Badge>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
              Progression
            </span>
            <span className="text-xs font-body font-medium text-foreground">
              {checkedCount}/{total} — {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* System gate indicators — read-only */}
        <div className="mb-3 space-y-1">
          <p className="text-[10px] font-body text-muted-foreground uppercase tracking-wider px-3 pb-1">
            Portes système
          </p>
          {gates.loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-body">Vérification des portes…</span>
            </div>
          ) : (
            <>
              {gatesErrored && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/5"
                >
                  <p className="text-xs font-body text-amber-700 truncate">
                    Vérification des portes impossible — {gates.error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setGatesReloadKey((k) => k + 1)}
                    className="flex items-center gap-1 text-[10px] font-body font-medium text-amber-700 hover:underline flex-shrink-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Réessayer
                  </button>
                </div>
              )}
              {gateConfig.map((gate) => {
                const status = gates[gate.key];
                const statusLabel =
                  status === "pass"
                    ? gate.passLabel
                    : status === "fail"
                      ? gate.failLabel
                      : status === "error"
                        ? "Erreur"
                        : collectionId
                          ? "En attente"
                          : "Aucune collection";
                return (
                  <div
                    key={gate.key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
                      status === "pass"
                        ? "bg-emerald-500/5"
                        : status === "fail"
                          ? "bg-red-500/5"
                          : status === "error"
                            ? "bg-amber-500/5"
                            : "bg-muted/30"
                    }`}
                  >
                    {status === "pass" ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : status === "fail" ? (
                      <ShieldX className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : status === "error" ? (
                      <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <p className="text-xs font-body text-foreground truncate">{gate.title}</p>
                      <span
                        className={`text-[10px] font-body font-medium flex-shrink-0 ${
                          status === "pass"
                            ? "text-emerald-600"
                            : status === "fail"
                              ? "text-red-500"
                              : status === "error"
                                ? "text-amber-600"
                                : "text-muted-foreground"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="border-t border-border/50 mb-2" />

        {/* Manual tasks */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body py-6 text-center">
            Aucune tâche de lancement.
          </p>
        ) : (
          sorted.map((item) => {
            const checked = item.status === "done";
            return (
              <button
                key={item.id}
                onClick={() => toggleTask(item.id)}
                className="w-full flex items-start gap-3 p-3 rounded-md text-left transition-all duration-200 hover:bg-muted/40 group"
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                    checked
                      ? "bg-navy border-navy"
                      : "border-border/70 group-hover:border-lavande/50"
                  }`}
                >
                  {checked && (
                    <svg className="h-2.5 w-2.5 text-creme" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-body font-medium transition-all duration-200 ${
                      checked
                        ? "line-through text-muted-foreground/50"
                        : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
