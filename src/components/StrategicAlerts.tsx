import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, BellOff, CheckCircle2, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StrategicAlert {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  trigger_type: string;
  is_read: boolean;
  is_dismissed: boolean;
  triggered_at: string;
}

const SEVERITY_CONFIG: Record<string, { badge: "destructive" | "default" | "outline"; icon: string; border: string; bg: string }> = {
  critical: { badge: "destructive", icon: "🔴", border: "border-destructive/40", bg: "bg-destructive/5" },
  warning:  { badge: "default", icon: "🟡", border: "border-yellow-500/30", bg: "bg-yellow-500/5" },
  info:     { badge: "outline", icon: "🔵", border: "border-accent/30", bg: "bg-accent/5" },
};

const CATEGORY_LABELS: Record<string, string> = {
  gate: "Gate",
  review: "Review",
  cash: "Cash",
};

export default function StrategicAlerts({ compact = false }: { compact?: boolean }) {
  const [alerts, setAlerts] = useState<StrategicAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("strategic_alerts")
        .select("*")
        .eq("is_dismissed", false)
        .order("triggered_at", { ascending: false })
        .limit(compact ? 5 : 20);
      if (error) throw error;
      setAlerts((data as StrategicAlert[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    await supabase.from("strategic_alerts").update({ is_read: true }).eq("id", id);
  };

  const dismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("strategic_alerts").update({ is_dismissed: true }).eq("id", id);
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) return null;
  if (alerts.length === 0 && compact) return null;

  return (
    <Card className={`card-lift ${unreadCount > 0 ? "border-destructive/30" : "border-border"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-body font-medium flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-destructive" />
            Strategic Gates & Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[8px] h-4 px-1.5">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {!compact && (
            <span className="text-[9px] font-body text-muted-foreground uppercase tracking-wider">
              {alerts.length} alerte{alerts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <p className="text-[10px] font-body">Aucune alerte active — all clear</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            return (
              <div
                key={alert.id}
                onClick={() => !alert.is_read && markRead(alert.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all group ${cfg.border} ${cfg.bg} ${
                  alert.is_read ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{cfg.icon}</span>
                      <p className={`text-[11px] font-body font-medium text-foreground ${
                        !alert.is_read ? "" : "font-normal"
                      }`}>
                        {alert.title}
                      </p>
                    </div>
                    {!compact && alert.description && (
                      <p className="text-[10px] font-body text-muted-foreground leading-relaxed ml-5">
                        {alert.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 ml-5">
                      <Badge variant={cfg.badge} className="text-[7px] h-3.5 px-1">
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-[7px] h-3.5 px-1">
                        {CATEGORY_LABELS[alert.category] || alert.category}
                      </Badge>
                      <span className="text-[8px] text-muted-foreground font-body">
                        {new Date(alert.triggered_at).toLocaleDateString("fr-FR")}
                      </span>
                      {!alert.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
