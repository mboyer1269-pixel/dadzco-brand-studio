import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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

export function LaunchChecklist() {
  const [tasks, setTasks] = useState<LaunchTask[]>([]);
  const [loading, setLoading] = useState(true);
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

      if (existing && existing.length > 0) {
        setTasks(existing as LaunchTask[]);
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const rows = SEED_ITEMS.map((title) => ({
        user_id: user.id,
        title,
        date: today,
        priority: "medium",
        status: "todo",
        category: LAUNCH_CATEGORY,
        cash_alert: false,
      }));

      const { error: insertError } = await supabase
        .from("planner_tasks")
        .insert(rows);
      if (insertError) throw insertError;

      const { data: seeded, error: refetchError } = await supabase
        .from("planner_tasks")
        .select("id, title, status")
        .eq("user_id", user.id)
        .eq("category", LAUNCH_CATEGORY);
      if (refetchError) throw refetchError;

      setTasks((seeded || []) as LaunchTask[]);
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

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
    );

    const { error } = await supabase
      .from("planner_tasks")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)),
      );
      toast.error("Impossible de mettre à jour la tâche.");
    }
  };

  const sorted = [...tasks].sort(
    (a, b) => (ORDER[a.title] ?? 999) - (ORDER[b.title] ?? 999),
  );
  const checkedCount = sorted.filter((t) => t.status === "done").length;
  const total = sorted.length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  const getStatusLabel = () => {
    if (total === 0) return "VIDE";
    if (progress === 100) return "GO LIVE";
    if (progress >= 60) return "PRESQUE PRÊT";
    if (progress > 0) return "EN COURS";
    return "EN ATTENTE";
  };

  const getStatusColor = () => {
    if (progress === 100)
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (progress >= 60)
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

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
          <Badge
            variant="outline"
            className={`text-[9px] font-body ${getStatusColor()}`}
          >
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
                    <svg
                      className="h-2.5 w-2.5 text-creme"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
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
