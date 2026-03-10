import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

type MilestoneStatus = "done" | "active" | "upcoming";

interface Milestone {
  id: string;
  label: string;
  date: string;
  status: MilestoneStatus;
  channel: string;
  description: string;
}

const INITIAL_MILESTONES: Milestone[] = [
  {
    id: "manus-draft",
    label: "Manus AI Draft",
    date: "J-14",
    status: "done",
    channel: "Manus AI",
    description: "Stratégie marketing générée et validée",
  },
  {
    id: "leonardo-visuals",
    label: "Leonardo Visuals",
    date: "J-12",
    status: "done",
    channel: "Leonardo AI",
    description: "Visuels campagne générés (Feed, Stories, Ads)",
  },
  {
    id: "copy-approval",
    label: "Copy & Assets Approval",
    date: "J-10",
    status: "active",
    channel: "Interne",
    description: "Validation fondateur sur tous les assets créatifs",
  },
  {
    id: "meta-setup",
    label: "Meta Campaign Setup",
    date: "J-7",
    status: "upcoming",
    channel: "Meta Ads",
    description: "Configuration campagne, audiences, budgets",
  },
  {
    id: "teaser-launch",
    label: "Teaser Campaign",
    date: "J-5",
    status: "upcoming",
    channel: "Instagram",
    description: "Stories teaser + activation waitlist",
  },
  {
    id: "meta-ad-launch",
    label: "Meta Ad Launch",
    date: "J-1",
    status: "upcoming",
    channel: "Meta Ads",
    description: "Lancement campagne acquisition (Lookalike 1%)",
  },
  {
    id: "drop-day",
    label: "Drop Day",
    date: "J-Day",
    status: "upcoming",
    channel: "Shopify",
    description: "Mise en ligne produits + notification waitlist",
  },
  {
    id: "retargeting",
    label: "Retargeting Wave",
    date: "J+3",
    status: "upcoming",
    channel: "Meta Ads",
    description: "Retargeting visiteurs non-acheteurs + UGC",
  },
];

const STATUS_STYLES: Record<MilestoneStatus, { dot: string; line: string; badge: string; text: string }> = {
  done: {
    dot: "bg-navy border-navy",
    line: "bg-navy/30",
    badge: "bg-navy/10 text-navy border-navy/20",
    text: "text-muted-foreground/60",
  },
  active: {
    dot: "bg-lavande border-lavande ring-4 ring-lavande/20",
    line: "bg-border",
    badge: "bg-lavande/10 text-lavande border-lavande/30",
    text: "text-foreground",
  },
  upcoming: {
    dot: "bg-muted border-border",
    line: "bg-border/50",
    badge: "bg-muted text-muted-foreground border-border/50",
    text: "text-muted-foreground",
  },
};

export function AutomationGantt() {
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);

  const cycleStatus = (id: string) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next: MilestoneStatus =
          m.status === "upcoming" ? "active" : m.status === "active" ? "done" : "upcoming";
        return { ...m, status: next };
      })
    );
  };

  const doneCount = milestones.filter((m) => m.status === "done").length;
  const activeCount = milestones.filter((m) => m.status === "active").length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base font-light flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-lavande" />
              Automation Timeline
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Jalons de lancement — cliquez pour changer le statut
            </p>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-[8px] font-body bg-navy/10 text-navy border-navy/20">
              {doneCount} terminé{doneCount > 1 ? "s" : ""}
            </Badge>
            {activeCount > 0 && (
              <Badge variant="outline" className="text-[8px] font-body bg-lavande/10 text-lavande border-lavande/30">
                {activeCount} actif{activeCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {milestones.map((milestone, index) => {
            const styles = STATUS_STYLES[milestone.status];
            const isLast = index === milestones.length - 1;

            return (
              <button
                key={milestone.id}
                onClick={() => cycleStatus(milestone.id)}
                className="relative flex items-start gap-4 w-full text-left group pb-1"
              >
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                  <div
                    className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${styles.dot}`}
                  />
                  {!isLast && (
                    <div className={`w-px flex-1 min-h-[40px] transition-colors duration-300 ${styles.line}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4 -mt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-body font-medium transition-colors ${styles.text} ${milestone.status === "done" ? "line-through" : ""}`}>
                      {milestone.label}
                    </span>
                    <Badge variant="outline" className={`text-[7px] font-body px-1.5 py-0 h-4 ${styles.badge}`}>
                      {milestone.channel}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-body text-muted-foreground/60 mb-1">
                    {milestone.description}
                  </p>
                  <span className="text-[9px] font-body font-medium text-muted-foreground/40 uppercase tracking-widest">
                    {milestone.date}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
