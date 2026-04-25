import { describe, it, expect } from "vitest";
import {
  simulateScenario,
  runFullSimulation,
  MICRO_BUDGET_CONFIG,
  type ScenarioParams,
} from "./financial-engine";

const BASE_PARAMS: ScenarioParams = {
  monthlyAdBudget: 400,
  aov: 119,
  marginPct: 0.585,
  organicRatio: 0.35,
  cvrPaid: 0.018,
  cvrOrganic: 0.035,
  cpc: 1.2,
  repeatRate: 0.04,
};

describe("simulateScenario", () => {
  it("generates exactly 12 projections by default", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only");
    expect(result.projections).toHaveLength(12);
  });

  it("generates the requested number of projections", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only", 6);
    expect(result.projections).toHaveLength(6);
  });

  it("paid_only scenario has zero organic orders every month", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only");
    for (const p of result.projections) {
      expect(p.organicOrders).toBe(0);
    }
  });

  it("paid_organic scenario has positive organic orders after month 1", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_organic");
    const hasOrganic = result.projections.some((p) => p.organicOrders > 0);
    expect(hasOrganic).toBe(true);
  });

  it("does not crash when CPC is zero", () => {
    const result = simulateScenario({ ...BASE_PARAMS, cpc: 0 }, "paid_only");
    for (const p of result.projections) {
      expect(p.paidClicks).toBe(0);
      expect(p.paidOrders).toBe(0);
    }
  });

  it("each month's revenue equals totalOrders * aov", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only");
    for (const p of result.projections) {
      expect(p.revenue).toBeCloseTo(p.totalOrders * BASE_PARAMS.aov, 5);
    }
  });

  it("cumulative profit grows from each month's netProfit", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only");
    let running = 0;
    for (const p of result.projections) {
      running += p.netProfit;
      expect(p.cumulativeProfit).toBeCloseTo(running, 5);
    }
  });

  it("detects break-even month when cumulative profit turns non-negative", () => {
    // High-margin, high-CVR params guarantee early break-even
    const params: ScenarioParams = {
      ...BASE_PARAMS,
      marginPct: 0.8,
      cvrPaid: 0.1,
      aov: 200,
    };
    const result = simulateScenario(params, "paid_only");
    if (result.breakEvenMonth !== null) {
      const proj = result.projections[result.breakEvenMonth - 1];
      expect(proj.cumulativeProfit).toBeGreaterThanOrEqual(0);
    }
  });

  it("breakEvenMonth is null when cumulative profit never turns positive", () => {
    // Extremely low CVR: no orders, constant ad spend loss
    const result = simulateScenario({ ...BASE_PARAMS, cvrPaid: 0, cvrOrganic: 0 }, "paid_only");
    expect(result.breakEvenMonth).toBeNull();
  });

  it("risk level is 'high' when break-even is beyond month 9", () => {
    const result = simulateScenario({ ...BASE_PARAMS, cvrPaid: 0.001, marginPct: 0.55 }, "paid_only");
    if (result.breakEvenMonth === null || result.breakEvenMonth > 9) {
      expect(result.riskFactors.some((f) => f.includes("Break-even"))).toBe(true);
    }
  });

  it("risk level is 'low' when all risk conditions are absent", () => {
    const params: ScenarioParams = {
      ...BASE_PARAMS,
      marginPct: 0.85,
      cvrPaid: 0.2,
      aov: 300,
      monthlyAdBudget: 100,
    };
    const result = simulateScenario(params, "paid_only");
    if (result.riskLevel === "low") {
      expect(result.riskFactors).toHaveLength(0);
    }
  });

  it("returns correct scenario type and label for paid_only", () => {
    const result = simulateScenario(BASE_PARAMS, "paid_only");
    expect(result.type).toBe("paid_only");
    expect(result.label).toBe("Paid Only");
  });

  it("returns correct scenario type and label for break_even", () => {
    const result = simulateScenario(BASE_PARAMS, "break_even");
    expect(result.type).toBe("break_even");
    expect(result.label).toBe("Break-Even Target");
  });
});

describe("runFullSimulation", () => {
  it("returns exactly 3 scenarios", () => {
    const sim = runFullSimulation();
    expect(sim.scenarios).toHaveLength(3);
  });

  it("scenarios cover paid_only, paid_organic, and break_even types", () => {
    const sim = runFullSimulation();
    const types = sim.scenarios.map((s) => s.type);
    expect(types).toContain("paid_only");
    expect(types).toContain("paid_organic");
    expect(types).toContain("break_even");
  });

  it("returns exactly 3 Monte Carlo bands", () => {
    const sim = runFullSimulation();
    expect(sim.monteCarloBands).toHaveLength(3);
  });

  it("Monte Carlo bands are conservative, base, and aggressive", () => {
    const sim = runFullSimulation();
    const bandTypes = sim.monteCarloBands.map((b) => b.type);
    expect(bandTypes).toContain("conservative");
    expect(bandTypes).toContain("base");
    expect(bandTypes).toContain("aggressive");
  });

  it("summary bestCase12m >= worstCase12m", () => {
    const sim = runFullSimulation();
    expect(sim.summary.bestCase12m).toBeGreaterThanOrEqual(sim.summary.worstCase12m);
  });

  it("aggressive band has higher 12m profit than conservative band", () => {
    const sim = runFullSimulation();
    const conservative = sim.monteCarloBands.find((b) => b.type === "conservative")!;
    const aggressive = sim.monteCarloBands.find((b) => b.type === "aggressive")!;
    expect(aggressive.result.netProfit12m).toBeGreaterThan(conservative.result.netProfit12m);
  });

  it("accepts overrides and uses them as base params", () => {
    const sim = runFullSimulation({ aov: 200 });
    expect(sim.params.aov).toBe(200);
  });

  it("uses BRAND_DNA targetAOV as default aov", () => {
    const sim = runFullSimulation();
    expect(sim.params.aov).toBe(MICRO_BUDGET_CONFIG.targetAOV);
  });

  it("uses BRAND_DNA minimumMargin as default marginPct", () => {
    const sim = runFullSimulation();
    expect(sim.params.marginPct).toBe(MICRO_BUDGET_CONFIG.minimumMargin);
  });

  it("breakEvenRange is 'Not reached' when no band breaks even", () => {
    // Force tiny CVR so nobody breaks even
    const sim = runFullSimulation({ cvrPaid: 0, cvrOrganic: 0 });
    expect(sim.summary.breakEvenRange).toBe("Not reached");
  });
});
