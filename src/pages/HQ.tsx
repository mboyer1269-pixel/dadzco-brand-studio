import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, TrendingUp, DollarSign, FolderOpen,
  Sparkles, Loader2, ArrowRight, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import StrategicAlerts from "@/components/StrategicAlerts";

interface CHAPMove {
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export default function HQ() {
  const { toast } = useToast();
  const [chapMoves, setChapMoves] = useState<CHAPMove[]>([]);
  const [isLoadingChap, setIsLoadingChap] = useState(false);

  const handleAskCHAP = async () => {
    setIsLoadingChap(true);
    try {
      const { data, error } = await supabase.functions.invoke("round-table", {
        body: {
          taskType: "chap",
          customInstructions: "Return ONLY a JSON object with a single key 'moves' containing an array of exactly 3 objects. Each object: { action (string, max 15 words), reason (string, max 25 words), priority ('high'|'medium'|'low') }. No collections, no SKUs. Just 3 strategic moves for DADZCO brand growth and profitability.",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // CHAP response: { moves: [...] }
      const moves = data?.moves || [];
      setChapMoves(moves.slice(0, 3));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("CHAP error:", e);
      toast({ title: "CHAP error", description: message, variant: "destructive" });
    } finally {
      setIsLoadingChap(false);
    }
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "destructive";
    if (p === "medium") return "secondary";
    return "outline";
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Headquarters
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            Growth & profitability command center
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Capsules", value: "—", icon: FolderOpen },
            { label: "Avg Margin", value: "—", icon: DollarSign },
            { label: "Avg QA Score", value: "—", icon: TrendingUp },
            { label: "Risk Overrides", value: "0", icon: AlertTriangle },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-display font-light text-foreground mt-1">{kpi.value}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CHAP Section */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg font-light flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              CHAP — Brand Manager
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body">
              Max 3 actionable moves for your next sprint
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {chapMoves.length === 0 && !isLoadingChap && (
              <Button
                onClick={handleAskCHAP}
                className="font-body text-xs tracking-[0.15em] uppercase h-12 btn-glow"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ask CHAP for 3 Moves
              </Button>
            )}

            {isLoadingChap && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                <Loader2 className="h-4 w-4 animate-spin" />
                CHAP is analyzing…
              </div>
            )}

            {chapMoves.length > 0 && (
              <div className="space-y-3">
                {chapMoves.map((move, i) => (
                  <div key={i} className="p-4 rounded-md bg-muted/50 border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-body font-medium text-foreground">{move.action}</p>
                        <p className="text-xs text-muted-foreground font-body mt-1">{move.reason}</p>
                      </div>
                      <Badge variant={priorityColor(move.priority)} className="text-[9px] font-body shrink-0">
                        {move.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setChapMoves([]); }}
                  className="text-xs font-body text-muted-foreground"
                >
                  Reset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick nav */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Create Capsule", to: "/create", icon: Sparkles },
            { label: "Collections", to: "/collections", icon: FolderOpen },
            { label: "Launch Plan", to: "/launch", icon: ArrowRight },
          ].map((nav) => (
            <Link key={nav.to} to={nav.to}>
              <Card className="border-border card-lift cursor-pointer hover:border-accent/50">
                <CardContent className="p-5 flex items-center gap-3">
                  <nav.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-body font-medium text-foreground">{nav.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Alerts */}
        <StrategicAlerts compact />
      </div>
    </AppLayout>
  );
}
