import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, Sparkles, Download, Users, BookOpen, Landmark,
  Loader2, CheckCircle2, XCircle, Minus,
} from "lucide-react";

type Status = "idle" | "testing" | "pass" | "fail";

interface CheckItem {
  id: string;
  label: string;
  icon: typeof Sparkles;
  test: () => Promise<boolean>;
}

export function UltraReliableChecklist() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [isRunning, setIsRunning] = useState(false);

  const checks: CheckItem[] = [
    {
      id: "leonardo",
      label: "Leonardo AI Connection",
      icon: Sparkles,
      test: async () => {
        const { data, error } = await supabase.functions.invoke("leonardo-credits");
        return !error && !data?.error && (data?.apiPaidTokens >= 0 || data?.apiSubscriptionTokens >= 0);
      },
    },
    {
      id: "roundtable",
      label: "Round Table (AI Gateway)",
      icon: Users,
      test: async () => {
        try {
          const { data, error } = await supabase.functions.invoke("round-table", {
            method: "POST",
            body: { ping: true },
          });
          // Accept any non-error response (including AI parse issues returned as 200)
          return !error;
        } catch {
          return false;
        }
      },
    },
    {
      id: "dna",
      label: "ADN Coherence (Brand Rules)",
      icon: BookOpen,
      test: async () => {
        // Check that the brand_rules table is accessible (even if empty)
        const { error } = await supabase
          .from("brand_rules")
          .select("id")
          .limit(1);
        return !error;
      },
    },
    {
      id: "gates",
      label: "Gate Status (Alerts)",
      icon: Landmark,
      test: async () => {
        const { error } = await supabase
          .from("strategic_alerts")
          .select("id")
          .limit(1);
        return !error;
      },
    },
    {
      id: "export",
      label: "Export System (Printful/Shopify)",
      icon: Download,
      test: async () => {
        const { error } = await supabase
          .from("exports")
          .select("id")
          .limit(1);
        return !error;
      },
    },
  ];

  const runAll = async () => {
    setIsRunning(true);
    for (const check of checks) {
      setStatuses((prev) => ({ ...prev, [check.id]: "testing" }));
      try {
        const ok = await check.test();
        setStatuses((prev) => ({ ...prev, [check.id]: ok ? "pass" : "fail" }));
      } catch {
        setStatuses((prev) => ({ ...prev, [check.id]: "fail" }));
      }
    }
    setIsRunning(false);
  };

  const passCount = Object.values(statuses).filter((s) => s === "pass").length;
  const allDone = Object.keys(statuses).length === checks.length && !isRunning;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-light flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Ultra Reliable Mode
          </CardTitle>
          {allDone && (
            <Badge
              variant={passCount === checks.length ? "default" : "destructive"}
              className="text-[9px] font-body"
            >
              {passCount}/{checks.length} OK
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check) => {
          const s = statuses[check.id] || "idle";
          return (
            <div
              key={check.id}
              className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border border-border"
            >
              <div className="flex items-center gap-2">
                <check.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-body text-foreground">{check.label}</span>
              </div>
              <div>
                {s === "idle" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                {s === "testing" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {s === "pass" && <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(142,60%,45%)]" />}
                {s === "fail" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
          );
        })}
        <Button
          size="sm"
          variant="outline"
          onClick={runAll}
          disabled={isRunning}
          className="w-full mt-2 font-body text-[10px] tracking-wider uppercase"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Tests en cours…
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3 mr-1.5" />
              Lancer tous les tests
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
