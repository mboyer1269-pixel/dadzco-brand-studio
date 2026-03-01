// DADZCO Financial Engine — Micro-Budget Mode
// Monte Carlo simulation for early-stage brand projections

import { BRAND_DNA } from "@/core/brand_dna";

/* ── Configuration ── */
export const MICRO_BUDGET_CONFIG = {
  monthlyAdBudgetMin: 300,
  monthlyAdBudgetMax: 500,
  targetAOV: BRAND_DNA.financial_constraints.target_aov, // 119 CAD
  minimumMargin: BRAND_DNA.financial_constraints.minimum_margin_pct / 100, // 0.55
  maxCACRatio: BRAND_DNA.financial_constraints.max_cac_ratio, // 0.30
  maxCAC: 119 * 0.30, // 35.7 CAD
  repeatPurchaseTarget: BRAND_DNA.financial_constraints.repeat_purchase_target_pct / 100,
} as const;

/* ── Types ── */
export type ScenarioType = "paid_only" | "paid_organic" | "break_even";
export type RiskLevel = "low" | "medium" | "high";
export type BandType = "conservative" | "base" | "aggressive";

export interface ScenarioParams {
  monthlyAdBudget: number;
  aov: number;
  marginPct: number;
  organicRatio: number; // 0 for paid only, 0.3-0.5 for paid+organic
  cvrPaid: number;      // conversion rate paid (e.g. 0.015)
  cvrOrganic: number;   // conversion rate organic
  cpc: number;          // cost per click
  repeatRate: number;   // monthly repeat purchase rate
}

export interface MonthProjection {
  month: number;
  adSpend: number;
  paidClicks: number;
  paidOrders: number;
  organicOrders: number;
  totalOrders: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  cumulativeProfit: number;
  roas: number;
  cac: number;
  repeatOrders: number;
}

export interface ScenarioResult {
  type: ScenarioType;
  label: string;
  projections: MonthProjection[];
  breakEvenMonth: number | null;
  requiredROAS: number;
  requiredCVR: number;
  netProfit3m: number;
  netProfit6m: number;
  netProfit12m: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
}

export interface MonteCarloBand {
  type: BandType;
  label: string;
  multiplier: number;
  result: ScenarioResult;
}

export interface FinancialSimulation {
  params: ScenarioParams;
  scenarios: ScenarioResult[];
  monteCarloBands: MonteCarloBand[];
  summary: {
    bestCase12m: number;
    worstCase12m: number;
    breakEvenRange: string;
    overallRisk: RiskLevel;
  };
}

/* ── Helpers ── */
function assessRisk(result: Pick<ScenarioResult, "breakEvenMonth" | "netProfit12m" | "requiredROAS">): { level: RiskLevel; factors: string[] } {
  const factors: string[] = [];

  if (result.breakEvenMonth === null || result.breakEvenMonth > 9) {
    factors.push("Break-even beyond 9 months");
  }
  if (result.netProfit12m < 0) {
    factors.push("Negative 12-month P&L");
  }
  if (result.requiredROAS > 4) {
    factors.push(`Required ROAS ${result.requiredROAS.toFixed(1)}x is aggressive`);
  }
  if (result.breakEvenMonth !== null && result.breakEvenMonth > 6) {
    factors.push("Slow capital recovery");
  }

  const level: RiskLevel = factors.length >= 3 ? "high" : factors.length >= 1 ? "medium" : "low";
  return { level, factors };
}

/* ── Core simulation ── */
export function simulateScenario(
  params: ScenarioParams,
  type: ScenarioType,
  months = 12
): ScenarioResult {
  const projections: MonthProjection[] = [];
  let cumProfit = 0;
  let breakEvenMonth: number | null = null;
  let totalCustomers = 0;

  for (let m = 1; m <= months; m++) {
    const adSpend = params.monthlyAdBudget;
    const paidClicks = params.cpc > 0 ? Math.floor(adSpend / params.cpc) : 0;
    const paidOrders = Math.floor(paidClicks * params.cvrPaid);

    // Organic grows slightly over time
    const organicGrowth = type === "paid_only" ? 0 : 1 + (m - 1) * 0.05;
    const organicOrders = type === "paid_only"
      ? 0
      : Math.floor(paidOrders * params.organicRatio * organicGrowth);

    // Repeat orders from existing customer base
    const repeatOrders = Math.floor(totalCustomers * params.repeatRate);
    const newOrders = paidOrders + organicOrders;
    const totalOrders = newOrders + repeatOrders;

    totalCustomers += newOrders;

    const revenue = totalOrders * params.aov;
    const cogs = revenue * (1 - params.marginPct);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - adSpend;
    cumProfit += netProfit;

    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const cac = newOrders > 0 ? adSpend / newOrders : Infinity;

    if (breakEvenMonth === null && cumProfit >= 0 && m > 1) {
      breakEvenMonth = m;
    }

    projections.push({
      month: m,
      adSpend,
      paidClicks,
      paidOrders,
      organicOrders,
      totalOrders,
      revenue,
      cogs,
      grossProfit,
      netProfit,
      cumulativeProfit: cumProfit,
      roas,
      cac: cac === Infinity ? 0 : Math.round(cac * 100) / 100,
      repeatOrders,
    });
  }

  // Required ROAS to break even monthly
  const avgMonthlyOrders = projections.reduce((s, p) => s + p.totalOrders, 0) / months;
  const requiredROAS = params.marginPct > 0 ? 1 / params.marginPct : Infinity;
  const requiredCVR = params.cpc > 0 && params.aov > 0
    ? (params.monthlyAdBudget * requiredROAS) / (params.monthlyAdBudget / params.cpc) / params.aov
    : 0;

  const labels: Record<ScenarioType, string> = {
    paid_only: "Paid Only",
    paid_organic: "Paid + Organic",
    break_even: "Break-Even Target",
  };

  const risk = assessRisk({
    breakEvenMonth,
    netProfit12m: projections[11]?.cumulativeProfit ?? 0,
    requiredROAS,
  });

  return {
    type,
    label: labels[type],
    projections,
    breakEvenMonth,
    requiredROAS: Math.round(requiredROAS * 100) / 100,
    requiredCVR: Math.round(requiredCVR * 10000) / 100,
    netProfit3m: projections[2]?.cumulativeProfit ?? 0,
    netProfit6m: projections[5]?.cumulativeProfit ?? 0,
    netProfit12m: projections[11]?.cumulativeProfit ?? 0,
    riskLevel: risk.level,
    riskFactors: risk.factors,
  };
}

/* ── Monte Carlo bands ── */
const BAND_CONFIGS: { type: BandType; label: string; cvrMult: number; organicMult: number; repeatMult: number }[] = [
  { type: "conservative", label: "Conservative", cvrMult: 0.7, organicMult: 0.5, repeatMult: 0.6 },
  { type: "base",         label: "Base",         cvrMult: 1.0, organicMult: 1.0, repeatMult: 1.0 },
  { type: "aggressive",   label: "Aggressive",   cvrMult: 1.4, organicMult: 1.6, repeatMult: 1.3 },
];

export function runFullSimulation(overrides?: Partial<ScenarioParams>): FinancialSimulation {
  const baseParams: ScenarioParams = {
    monthlyAdBudget: 400,
    aov: MICRO_BUDGET_CONFIG.targetAOV,
    marginPct: MICRO_BUDGET_CONFIG.minimumMargin,
    organicRatio: 0.35,
    cvrPaid: 0.018,
    cvrOrganic: 0.035,
    cpc: 1.20,
    repeatRate: 0.04,
    ...overrides,
  };

  // Three scenarios
  const paidOnly = simulateScenario({ ...baseParams, organicRatio: 0 }, "paid_only");
  const paidOrganic = simulateScenario(baseParams, "paid_organic");
  const breakEven = simulateScenario(
    { ...baseParams, cvrPaid: baseParams.cvrPaid * 1.3, organicRatio: 0.5 },
    "break_even"
  );

  // Monte Carlo bands on paid+organic scenario
  const monteCarloBands: MonteCarloBand[] = BAND_CONFIGS.map((band) => {
    const adjusted: ScenarioParams = {
      ...baseParams,
      cvrPaid: baseParams.cvrPaid * band.cvrMult,
      organicRatio: baseParams.organicRatio * band.organicMult,
      repeatRate: baseParams.repeatRate * band.repeatMult,
    };
    return {
      type: band.type,
      label: band.label,
      multiplier: band.cvrMult,
      result: simulateScenario(adjusted, "paid_organic"),
    };
  });

  const allProfits = monteCarloBands.map((b) => b.result.netProfit12m);
  const breakEvenMonths = monteCarloBands
    .map((b) => b.result.breakEvenMonth)
    .filter((m): m is number => m !== null);

  const overallRisk: RiskLevel =
    allProfits.every((p) => p < 0) ? "high" :
    allProfits.some((p) => p < 0) ? "medium" : "low";

  return {
    params: baseParams,
    scenarios: [paidOnly, paidOrganic, breakEven],
    monteCarloBands,
    summary: {
      bestCase12m: Math.max(...allProfits),
      worstCase12m: Math.min(...allProfits),
      breakEvenRange: breakEvenMonths.length > 0
        ? `Month ${Math.min(...breakEvenMonths)}–${Math.max(...breakEvenMonths)}`
        : "Not reached",
      overallRisk,
    },
  };
}
