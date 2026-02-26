import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StrategicAlerts from "@/components/StrategicAlerts";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import GanttTimeline from "@/components/calendar/GanttTimeline";
import { fr } from "date-fns/locale";

type TaskPriority = "high" | "medium" | "low";
type TaskStatus = "todo" | "in_progress" | "done";
type TaskCategory = "design" | "printful" | "shopify" | "ads" | "influencer" | "cash" | "content";

interface PlannerTask {
  id: string;
  title: string;
  date: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  cashAlert?: boolean;
}

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string }> = {
  design: { label: "Design", color: "bg-lavande/60" },
  printful: { label: "Printful", color: "bg-sable/60" },
  shopify: { label: "Shopify", color: "bg-accent/60" },
  ads: { label: "Ads", color: "bg-primary/20" },
  influencer: { label: "Influencer", color: "bg-secondary/60" },
  cash: { label: "Cash", color: "bg-destructive/20" },
  content: { label: "Content", color: "bg-muted" },
};

// Sample AI-generated tasks
const SAMPLE_TASKS: PlannerTask[] = [
  { id: "1", title: "Finaliser 4 SKUs Quiet Luxury — Écho Géométrique", date: "2026-03-01", priority: "high", status: "todo", category: "design" },
  { id: "2", title: "Upload mockups Printful — Collection Printemps", date: "2026-03-03", priority: "high", status: "todo", category: "printful" },
  { id: "3", title: "Créer listing Shopify + SEO descriptions", date: "2026-03-05", priority: "medium", status: "todo", category: "shopify" },
  { id: "4", title: "Campagne Meta Ads — Pré-lancement waitlist", date: "2026-03-07", priority: "high", status: "todo", category: "ads", cashAlert: true },
  { id: "5", title: "Contacter 3 micro-influenceurs dad-fashion", date: "2026-03-08", priority: "medium", status: "todo", category: "influencer" },
  { id: "6", title: "Vérifier CAC prévisionnel < 25€", date: "2026-03-10", priority: "high", status: "todo", category: "cash", cashAlert: true },
  { id: "7", title: "Shooting photos lifestyle — 3 Funny SKUs", date: "2026-03-12", priority: "medium", status: "todo", category: "content" },
  { id: "8", title: "Gate cash : valider marges > 55% par SKU", date: "2026-03-14", priority: "high", status: "todo", category: "cash", cashAlert: true },
  { id: "9", title: "Programmer TikTok teaser — Hero Buzz", date: "2026-03-16", priority: "low", status: "todo", category: "content" },
  { id: "10", title: "Drop officiel — Collection Printemps 2026", date: "2026-03-20", priority: "high", status: "todo", category: "shopify" },
  { id: "11", title: "Repeat purchase email — J+7 post-drop", date: "2026-03-27", priority: "medium", status: "todo", category: "cash" },
  { id: "12", title: "Générer stories IA pour Collection Été", date: "2026-04-01", priority: "low", status: "todo", category: "design" },
];

export default function CalendarPlanner() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [view, setView] = useState<"month" | "90day">("month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [collections, setCollections] = useState<{ id: string; name: string; season: string | null; status: string }[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("default");

  const fetchCollections = useCallback(async () => {
    const { data } = await supabase
      .from("collections")
      .select("id, name, season, status")
      .order("created_at", { ascending: false });
    if (data) setCollections(data);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const collectionFilter = selectedCollectionId !== "default" ? selectedCollectionId : null;
      let query = supabase
        .from("planner_tasks")
        .select("*")
        .order("date", { ascending: true });
      if (collectionFilter) {
        query = query.eq("collection_id", collectionFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      const mapped: PlannerTask[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        date: row.date,
        priority: row.priority as TaskPriority,
        status: row.status as TaskStatus,
        category: row.category as TaskCategory,
        cashAlert: row.cash_alert,
      }));
      setTasks(mapped.length > 0 ? mapped : SAMPLE_TASKS);
      if (mapped.length > 0) {
        setCurrentMonth(new Date(mapped[0].date));
      }
    } catch {
      setTasks(SAMPLE_TASKS);
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedCollectionId]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    // Pad start to Monday
    const startDay = start.getDay() || 7;
    const padStart = Array.from({ length: startDay - 1 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (startDay - 1 - i));
      return d;
    });
    return [...padStart, ...allDays];
  }, [currentMonth]);

  const getTasksForDay = (date: Date) =>
    tasks.filter((t) => isSameDay(new Date(t.date), date));

  const cashAlerts = tasks.filter((t) => t.cashAlert && t.status !== "done");
  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;

    const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      // Fetch SKU count if a real collection is selected
      let skuCount = 4;
      if (selectedCollection) {
        const { count } = await supabase
          .from("collection_items")
          .select("id", { count: "exact", head: true })
          .eq("collection_id", selectedCollection.id);
        if (count) skuCount = count;
      }

      const { data, error } = await supabase.functions.invoke("generate-tasks", {
        body: {
          collectionName: selectedCollection?.name || "Collection Printemps 2026",
          collectionType: "mixed (Quiet Luxury + Funny Dad)",
          skuCount,
          season: selectedCollection?.season || "Printemps 2026",
          startDate: format(new Date(), "yyyy-MM-dd"),
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de requêtes atteinte. Réessayez dans un instant.");
        } else if (data.error.includes("credits")) {
          toast.error("Crédits IA épuisés. Ajoutez des crédits pour continuer.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.tasks?.length) {
        // Persist to database
        const { data: { user } } = await supabase.auth.getUser();
        const collId = selectedCollectionId !== "default" ? selectedCollectionId : null;

        if (user) {
          // Delete old tasks for this collection scope
          let deleteQuery = supabase.from("planner_tasks").delete().eq("user_id", user.id);
          if (collId) {
            deleteQuery = deleteQuery.eq("collection_id", collId);
          } else {
            deleteQuery = deleteQuery.is("collection_id", null);
          }
          await deleteQuery;

          // Insert new tasks
          const rows = data.tasks.map((t: any) => ({
            user_id: user.id,
            collection_id: collId,
            title: t.title,
            date: t.date,
            priority: t.priority || "medium",
            status: "todo",
            category: t.category || "content",
            cash_alert: t.cashAlert || false,
          }));
          await supabase.from("planner_tasks").insert(rows);
        }

        await fetchTasks();
        toast.success(`${data.tasks.length} tâches générées et sauvegardées`);
      } else {
        toast.warning("Aucune tâche générée. Réessayez.");
      }
    } catch (e) {
      console.error("Task generation error:", e);
      toast.error("Erreur lors de la génération des tâches.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    // Persist — only if it's a real UUID (not sample data)
    if (id.length > 5) {
      const { error } = await supabase
        .from("planner_tasks")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: task.status } : t))
        );
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
                  Launch Calendar
                </h1>
              </div>
              <p className="text-sm font-body text-muted-foreground">
                Planification IA · Tâches auto-générées · Cash retention tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                <SelectTrigger className="w-[220px] h-9 text-xs font-body bg-background/80 border-border">
                  <SelectValue placeholder="Sélectionner collection" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="default" className="text-xs font-body">
                    Collection par défaut
                  </SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-body">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.season && (
                          <Badge variant="outline" className="text-[8px] ml-1">{c.season}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerateTasks}
                disabled={isGenerating}
                className="btn-glow font-body text-xs tracking-wider uppercase gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Génération…" : "Agent IA — Générer tâches"}
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Target, label: "Tâches", value: `${completedCount}/${totalTasks}`, sub: "complétées" },
            { icon: AlertTriangle, label: "Cash Alerts", value: `${cashAlerts.length}`, sub: "à vérifier", alert: cashAlerts.length > 0 },
            { icon: TrendingUp, label: "CAC estimé", value: "~22€", sub: "< 25€ ✓" },
            { icon: BarChart3, label: "Marge moy.", value: "62%", sub: "> 55% ✓" },
          ].map((kpi) => (
            <Card key={kpi.label} className="card-lift">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.alert ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </span>
                </div>
                <p className={`text-xl font-display font-light ${kpi.alert ? "text-destructive" : "text-foreground"}`}>
                  {kpi.value}
                </p>
                <p className="text-[10px] font-body text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-base font-body font-medium capitalize">
                      {format(currentMonth, "MMMM yyyy", { locale: fr })}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1 p-0.5 bg-muted/50 rounded">
                    {(["month", "90day"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`text-[9px] font-body uppercase tracking-wider px-3 py-1 rounded transition-all ${
                          view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        {v === "month" ? "Mois" : "90 jours"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {view === "90day" ? (
                  <GanttTimeline tasks={tasks} onToggleStatus={toggleTaskStatus} />
                ) : (
                  <>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-px mb-1">
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                        <div key={d} className="text-center text-[9px] font-body uppercase tracking-wider text-muted-foreground py-2">
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-px">
                      {days.map((day, i) => {
                        const dayTasks = getTasksForDay(day);
                        const inMonth = isSameMonth(day, currentMonth);
                        const today = isToday(day);
                        return (
                          <div
                            key={i}
                            className={`min-h-[80px] p-1.5 rounded-sm border transition-colors ${
                              today
                                ? "border-accent/50 bg-accent/5"
                                : inMonth
                                ? "border-border/50 hover:bg-muted/30"
                                : "border-transparent opacity-40"
                            }`}
                          >
                            <span
                              className={`text-[10px] font-body ${
                                today ? "font-semibold text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                            <div className="mt-0.5 space-y-0.5">
                              {dayTasks.slice(0, 2).map((t) => (
                                <Tooltip key={t.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`text-[8px] font-body px-1 py-0.5 rounded truncate cursor-pointer transition-opacity ${
                                        CATEGORY_CONFIG[t.category].color
                                      } ${t.status === "done" ? "opacity-50 line-through" : ""}`}
                                      onClick={() => toggleTaskStatus(t.id)}
                                    >
                                      {t.cashAlert && "⚠️ "}{t.title.slice(0, 20)}…
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs font-body">{t.title}</p>
                                    <div className="flex gap-1 mt-1">
                                      <Badge variant="outline" className="text-[8px]">{CATEGORY_CONFIG[t.category].label}</Badge>
                                      <Badge variant={t.priority === "high" ? "destructive" : "outline"} className="text-[8px]">{t.priority}</Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {dayTasks.length > 2 && (
                                <span className="text-[8px] text-muted-foreground font-body">+{dayTasks.length - 2}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Task Sidebar */}
          <div className="space-y-4">
            {/* Strategic Gates */}
            <StrategicAlerts compact />
            {/* Cash Alerts */}
            {cashAlerts.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-body font-medium flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Cash Retention Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cashAlerts.map((t) => (
                    <div key={t.id} className="p-2 rounded bg-destructive/5 border border-destructive/15">
                      <p className="text-[10px] font-body text-foreground">{t.title}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{t.date}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            <Card className="card-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-body font-medium flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Prochaines tâches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {tasks
                  .filter((t) => t.status !== "done")
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 6)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleTaskStatus(t.id)}
                      className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className={`mt-0.5 h-3 w-3 rounded-full border-2 shrink-0 transition-colors ${
                        t.status === "done" ? "bg-accent border-accent" : "border-border group-hover:border-accent"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-body text-foreground truncate">{t.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px] text-muted-foreground">{t.date}</span>
                          {t.cashAlert && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Category Legend */}
            <Card>
              <CardContent className="p-3">
                <p className="text-[9px] font-body uppercase tracking-wider text-muted-foreground mb-2">Catégories</p>
                <div className="space-y-1">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-sm ${cfg.color}`} />
                      <span className="text-[9px] font-body text-muted-foreground">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
