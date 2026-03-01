import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, TrendingUp, AlertTriangle, BarChart3,
  Target, ArrowUpRight, ArrowDownRight, Minus, Calculator,
} from "lucide-react";
import {
  runFullSimulation,
  MICRO_BUDGET_CONFIG,
  type FinancialSimulation,
  type RiskLevel,
  type ScenarioResult,
  type MonteCarloBand,
} from "@/lib/financial-engine";
import { formatCAD } from "@/lib/pricing";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

/* ── Risk styling ── */
const riskConfig: Record<RiskLevel, { label: string; variant: "destructive" | "secondary" | "outline"; icon: typeof AlertTriangle }> = {
  high:   { label: "High Risk",   variant: "destructive", icon: AlertTriangle },
  medium: { label: "Medium Risk", variant: "secondary",   icon: Minus },
  low:    { label: "Low Risk",    variant: "outline",     icon: ArrowUpRight },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = riskConfig[level];
  return (
    <Badge variant={cfg.variant} className="text-[9px] font-body uppercase gap-1">
      <cfg.icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  );
}

/* ── Scenario card ── */
function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base font-light">{scenario.label}</CardTitle>
          <RiskBadge level={scenario.riskLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "3 months", value: scenario.netProfit3m },
            { label: "6 months", value: scenario.netProfit6m },
            { label: "12 months", value: scenario.netProfit12m },
          ].map((p) => (
            <div key={p.label} className="text-center p-2 rounded bg-muted/50">
              <p className="text-[9px] text-muted-foreground font-body uppercase tracking-wider">{p.label}</p>
              <p className={`text-sm font-body font-medium mt-0.5 ${p.value >= 0 ? "text-foreground" : "text-destructive"}`}>
                {formatCAD(p.value, 0)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-body">
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Break-even</span>
            <span className="font-medium text-foreground">
              {scenario.breakEvenMonth ? `Month ${scenario.breakEvenMonth}` : "Not reached"}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Req. ROAS</span>
            <span className="font-medium text-foreground">{scenario.requiredROAS}x</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Req. CVR</span>
            <span className="font-medium text-foreground">{scenario.requiredCVR}%</span>
          </div>
        </div>

        {scenario.riskFactors.length > 0 && (
          <div className="space-y-1">
            {scenario.riskFactors.map((f, i) => (
              <p key={i} className="text-[10px] text-muted-foreground font-body flex items-center gap-1.5">
                <AlertTriangle className="h-2.5 w-2.5 text-destructive shrink-0" />
                {f}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Monte Carlo band card ── */
function BandCard({ band }: { band: MonteCarloBand }) {
  const r = band.result;
  return (
    <div className="p-4 rounded-md border border-border bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-body font-medium text-foreground">{band.label}</p>
        <RiskBadge level={r.riskLevel} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs font-body">
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">12m Net</p>
          <p className={`font-medium ${r.netProfit12m >= 0 ? "text-foreground" : "text-destructive"}`}>
            {formatCAD(r.netProfit12m, 0)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">Break-even</p>
          <p className="font-medium text-foreground">{r.breakEvenMonth ? `M${r.breakEvenMonth}` : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">ROAS</p>
          <p className="font-medium text-foreground">{r.requiredROAS}x</p>
        </div>
        <div>
          <p className="text-muted-foreground text-[9px] uppercase">CVR</p>
          <p className="font-medium text-foreground">{r.requiredCVR}%</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function FinancialEngine() {
  const [budget, setBudget] = useState([400]);
  const [marginPct, setMarginPct] = useState([58]);
  const [cpc, setCpc] = useState([1.2]);
  const [cvr, setCvr] = useState([1.8]);

  const simulation: FinancialSimulation = useMemo(
    () =>
      runFullSimulation({
        monthlyAdBudget: budget[0],
        marginPct: marginPct[0] / 100,
        cpc: cpc[0],
        cvrPaid: cvr[0] / 100,
      }),
    [budget, marginPct, cpc, cvr]
  );

  // Chart data: cumulative profit by month for each band
  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      conservative: simulation.monteCarloBands[0]?.result.projections[i]?.cumulativeProfit ?? 0,
      base: simulation.monteCarloBands[1]?.result.projections[i]?.cumulativeProfit ?? 0,
      aggressive: simulation.monteCarloBands[2]?.result.projections[i]?.cumulativeProfit ?? 0,
    }));
  }, [simulation]);

  const sum = simulation.summary;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Financial Engine
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body italic">
            Micro-budget simulation · {formatCAD(MICRO_BUDGET_CONFIG.monthlyAdBudgetMin, 0)}–{formatCAD(MICRO_BUDGET_CONFIG.monthlyAdBudgetMax, 0)}/month
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Best Case 12m", value: formatCAD(sum.bestCase12m, 0), icon: ArrowUpRight, positive: sum.bestCase12m >= 0 },
            { label: "Worst Case 12m", value: formatCAD(sum.worstCase12m, 0), icon: ArrowDownRight, positive: sum.worstCase12m >= 0 },
            { label: "Break-Even", value: sum.breakEvenRange, icon: Target, positive: true },
            { label: "Overall Risk", value: sum.overallRisk.toUpperCase(), icon: AlertTriangle, positive: sum.overallRisk === "low" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-xl font-display font-light mt-1 ${kpi.positive ? "text-foreground" : "text-destructive"}`}>
                      {kpi.value}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg font-light flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">Monthly Ad Budget</span>
                  <span className="font-medium text-foreground">{formatCAD(budget[0], 0)}</span>
                </div>
                <Slider value={budget} onValueChange={setBudget} min={200} max={800} step={25} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">Margin</span>
                  <span className="font-medium text-foreground">{marginPct[0]}%</span>
                </div>
                <Slider value={marginPct} onValueChange={setMarginPct} min={40} max={75} step={1} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">CPC (Cost Per Click)</span>
                  <span className="font-medium text-foreground">{formatCAD(cpc[0])}</span>
                </div>
                <Slider value={cpc} onValueChange={setCpc} min={0.5} max={3.0} step={0.1} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-muted-foreground">CVR (Paid)</span>
                  <span className="font-medium text-foreground">{cvr[0]}%</span>
                </div>
                <Slider value={cvr} onValueChange={setCvr} min={0.5} max={5.0} step={0.1} />
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground font-body mt-4 tracking-wide">
              AOV: {formatCAD(MICRO_BUDGET_CONFIG.targetAOV, 0)} · Max CAC: {formatCAD(MICRO_BUDGET_CONFIG.maxCAC, 0)} · Min Margin: {MICRO_BUDGET_CONFIG.minimumMargin * 100}%
            </p>
          </CardContent>
        </Card>

        {/* Tabs: Scenarios / Monte Carlo / Projections */}
        <Tabs defaultValue="scenarios" className="space-y-4">
          <TabsList className="font-body">
            <TabsTrigger value="scenarios" className="text-xs">Scenarios</TabsTrigger>
            <TabsTrigger value="montecarlo" className="text-xs">Monte Carlo</TabsTrigger>
            <TabsTrigger value="projections" className="text-xs">Projections</TabsTrigger>
          </TabsList>

          {/* Scenarios */}
          <TabsContent value="scenarios">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {simulation.scenarios.map((s) => (
                <ScenarioCard key={s.type} scenario={s} />
              ))}
            </div>
          </TabsContent>

          {/* Monte Carlo */}
          <TabsContent value="montecarlo" className="space-y-4">
            <div className="space-y-3">
              {simulation.monteCarloBands.map((band) => (
                <BandCard key={band.type} band={band} />
              ))}
            </div>

            {/* Area chart */}
            <Card className="border-border">
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                      formatter={(val: number) => formatCAD(val, 0)}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area
                      type="monotone" dataKey="conservative" name="Conservative"
                      stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone" dataKey="base" name="Base"
                      stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.05)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone" dataKey="aggressive" name="Aggressive"
                      stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent) / 0.15)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projections table */}
          <TabsContent value="projections">
            <Card className="border-border">
              <CardContent className="pt-4 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[9px] font-body uppercase w-16">Month</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">Ad Spend</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">Orders</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">Revenue</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">Net P&L</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">Cumul.</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">ROAS</TableHead>
                      <TableHead className="text-[9px] font-body uppercase">CAC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.scenarios[1].projections.map((p) => (
                      <TableRow key={p.month}>
                        <TableCell className="text-xs font-body font-medium">M{p.month}</TableCell>
                        <TableCell className="text-xs font-body">{formatCAD(p.adSpend, 0)}</TableCell>
                        <TableCell className="text-xs font-body">{p.totalOrders}</TableCell>
                        <TableCell className="text-xs font-body">{formatCAD(p.revenue, 0)}</TableCell>
                        <TableCell className={`text-xs font-body font-medium ${p.netProfit >= 0 ? "text-foreground" : "text-destructive"}`}>
                          {formatCAD(p.netProfit, 0)}
                        </TableCell>
                        <TableCell className={`text-xs font-body font-medium ${p.cumulativeProfit >= 0 ? "text-foreground" : "text-destructive"}`}>
                          {formatCAD(p.cumulativeProfit, 0)}
                        </TableCell>
                        <TableCell className="text-xs font-body">{p.roas.toFixed(1)}x</TableCell>
                        <TableCell className="text-xs font-body">{formatCAD(p.cac, 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
