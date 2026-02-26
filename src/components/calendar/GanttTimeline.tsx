import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { format, addDays, differenceInDays, isToday, eachWeekOfInterval, startOfWeek } from "date-fns";
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

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bar: string }> = {
  design:     { label: "Design",     color: "bg-lavande/60",     bar: "bg-lavande" },
  printful:   { label: "Printful",   color: "bg-sable/60",       bar: "bg-sable" },
  shopify:    { label: "Shopify",    color: "bg-accent/60",      bar: "bg-accent" },
  ads:        { label: "Ads",        color: "bg-primary/20",     bar: "bg-primary" },
  influencer: { label: "Influencer", color: "bg-secondary/60",   bar: "bg-secondary" },
  cash:       { label: "Cash",       color: "bg-destructive/20", bar: "bg-destructive" },
  content:    { label: "Content",    color: "bg-muted",          bar: "bg-muted-foreground/50" },
};

const PRIORITY_WIDTH: Record<TaskPriority, number> = { high: 4, medium: 2, low: 1 };

interface GanttTimelineProps {
  tasks: PlannerTask[];
  onToggleStatus: (id: string) => void;
}

export default function GanttTimeline({ tasks, onToggleStatus }: GanttTimelineProps) {
  const sorted = useMemo(() => [...tasks].sort((a, b) => a.date.localeCompare(b.date)), [tasks]);

  const { startDate, totalDays, weeks } = useMemo(() => {
    if (sorted.length === 0) {
      const s = new Date();
      return { startDate: s, totalDays: 90, weeks: eachWeekOfInterval({ start: s, end: addDays(s, 90) }, { weekStartsOn: 1 }) };
    }
    const first = new Date(sorted[0].date);
    const last = new Date(sorted[sorted.length - 1].date);
    const span = Math.max(differenceInDays(last, first) + 14, 90);
    const s = addDays(first, -3);
    return {
      startDate: s,
      totalDays: span,
      weeks: eachWeekOfInterval({ start: s, end: addDays(s, span) }, { weekStartsOn: 1 }),
    };
  }, [sorted]);

  const todayOffset = differenceInDays(new Date(), startDate);

  // Group tasks by category for swim lanes
  const lanes = useMemo(() => {
    const map = new Map<TaskCategory, PlannerTask[]>();
    for (const t of sorted) {
      const arr = map.get(t.category) || [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return Array.from(map.entries());
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground font-body text-sm">
        Aucune tâche — Cliquez "Agent IA" pour générer le plan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Week headers */}
        <div className="flex border-b border-border mb-1">
          <div className="w-40 shrink-0" />
          <div className="flex-1 relative flex">
            {weeks.map((week, i) => {
              const offset = differenceInDays(week, startDate);
              const pct = (offset / totalDays) * 100;
              return (
                <div
                  key={i}
                  className="text-[8px] font-body uppercase tracking-wider text-muted-foreground py-1.5 border-l border-border/30 pl-1"
                  style={{ position: "absolute", left: `${Math.max(pct, 0)}%` }}
                >
                  {format(week, "d MMM", { locale: fr })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Swim lanes */}
        {lanes.map(([category, categoryTasks]) => (
          <div key={category} className="flex items-stretch border-b border-border/30 hover:bg-muted/20 transition-colors">
            {/* Lane label */}
            <div className="w-40 shrink-0 flex items-center gap-2 px-3 py-2">
              <div className={`h-2.5 w-2.5 rounded-sm ${CATEGORY_CONFIG[category].color}`} />
              <span className="text-[10px] font-body font-medium text-muted-foreground uppercase tracking-wider">
                {CATEGORY_CONFIG[category].label}
              </span>
              <Badge variant="outline" className="text-[8px] ml-auto">{categoryTasks.length}</Badge>
            </div>

            {/* Gantt bars */}
            <div className="flex-1 relative py-1.5 min-h-[36px]">
              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-accent/60 z-10"
                  style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                />
              )}

              {/* Week grid lines */}
              {weeks.map((week, i) => {
                const offset = differenceInDays(week, startDate);
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-border/20"
                    style={{ left: `${(offset / totalDays) * 100}%` }}
                  />
                );
              })}

              {/* Task bars */}
              {categoryTasks.map((task, idx) => {
                const dayOffset = differenceInDays(new Date(task.date), startDate);
                const leftPct = (dayOffset / totalDays) * 100;
                const widthDays = PRIORITY_WIDTH[task.priority];
                const widthPct = (widthDays / totalDays) * 100;

                return (
                  <Tooltip key={task.id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => onToggleStatus(task.id)}
                        className={`absolute h-5 rounded-sm cursor-pointer transition-all hover:brightness-110 hover:scale-y-125 ${
                          CATEGORY_CONFIG[category].bar
                        } ${task.status === "done" ? "opacity-40" : "opacity-90"}`}
                        style={{
                          left: `${Math.max(leftPct, 0)}%`,
                          width: `${Math.max(widthPct, 0.8)}%`,
                          top: `${4 + idx * 24}px`,
                        }}
                      >
                        <span className="text-[7px] font-body text-background px-1 truncate block leading-5">
                          {task.cashAlert && "⚠️ "}{task.title.slice(0, 25)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs font-body font-medium">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{task.date}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[8px]">{CATEGORY_CONFIG[category].label}</Badge>
                        <Badge variant={task.priority === "high" ? "destructive" : "outline"} className="text-[8px]">{task.priority}</Badge>
                        <Badge variant={task.status === "done" ? "default" : "outline"} className="text-[8px]">{task.status}</Badge>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}

        {/* Today label */}
        {todayOffset >= 0 && todayOffset <= totalDays && (
          <div className="flex">
            <div className="w-40 shrink-0" />
            <div className="flex-1 relative h-5">
              <div
                className="absolute text-[8px] font-body text-accent font-medium -translate-x-1/2"
                style={{ left: `${(todayOffset / totalDays) * 100}%` }}
              >
                Aujourd'hui
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
