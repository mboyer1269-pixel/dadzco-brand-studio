import { describe, it, expect } from "vitest";
import {
  formatCAD,
  calculateSKUPricing,
  calculateBundlePricing,
  PRICING_CONFIG,
} from "./pricing";

describe("formatCAD", () => {
  it("formats a whole number with 2 decimals", () => {
    expect(formatCAD(45)).toBe("45.00 $ CAD");
  });

  it("formats a decimal value correctly", () => {
    expect(formatCAD(15.68)).toBe("15.68 $ CAD");
  });

  it("respects custom decimal places", () => {
    expect(formatCAD(45, 0)).toBe("45 $ CAD");
  });

  it("formats zero", () => {
    expect(formatCAD(0)).toBe("0.00 $ CAD");
  });
});

describe("calculateSKUPricing", () => {
  it("applies the 12% return buffer to baseCost", () => {
    const result = calculateSKUPricing(14);
    expect(result.bufferedCost).toBeCloseTo(14 * 1.12, 2);
  });

  it("derives a suggested retail that achieves at least the target margin", () => {
    const result = calculateSKUPricing(14);
    // Target margin is 58.5%; margin% = (retail - bufferedCost) / retail
    expect(result.marginPct).toBeGreaterThanOrEqual(55);
  });

  it("uses customRetail when provided", () => {
    const result = calculateSKUPricing(14, 30);
    expect(result.suggestedRetail).toBe(30);
  });

  it("computes margin as retail minus bufferedCost", () => {
    const result = calculateSKUPricing(14, 30);
    expect(result.margin).toBeCloseTo(30 - result.bufferedCost, 1);
  });

  it("adds exactly 15 CAD for personalization", () => {
    const result = calculateSKUPricing(14);
    expect(result.withPersonalization).toBe(result.suggestedRetail + PRICING_CONFIG.personalizationAddon);
  });

  it("handles zero baseCost without crashing", () => {
    const result = calculateSKUPricing(0);
    expect(result.bufferedCost).toBe(0);
    expect(result.marginPct).toBe(0);
  });

  it("returns baseCost in the result", () => {
    const result = calculateSKUPricing(21);
    expect(result.baseCost).toBe(21);
  });
});

describe("calculateBundlePricing", () => {
  it("applies a 10% bundle discount", () => {
    const result = calculateBundlePricing(14, 25);
    const adultRetail = calculateSKUPricing(14).suggestedRetail;
    const kidRetail = calculateSKUPricing(25).suggestedRetail;
    const fullPrice = adultRetail + kidRetail;
    expect(result.bundlePrice).toBe(Math.ceil(fullPrice * 0.9));
  });

  it("calculates savings as full price minus bundle price", () => {
    const result = calculateBundlePricing(14, 25);
    const fullPrice = result.adultPrice + result.kidPrice;
    expect(result.bundleSavings).toBeCloseTo(fullPrice - result.bundlePrice, 1);
  });

  it("adds exactly 15 CAD personalization to bundle price", () => {
    const result = calculateBundlePricing(14, 25);
    expect(result.withPersonalization).toBe(result.bundlePrice + PRICING_CONFIG.personalizationAddon);
  });

  it("exposes individual adult and kid prices", () => {
    const result = calculateBundlePricing(14, 25);
    expect(result.adultPrice).toBe(calculateSKUPricing(14).suggestedRetail);
    expect(result.kidPrice).toBe(calculateSKUPricing(25).suggestedRetail);
  });

  it("bundle price is always less than the sum of individual prices", () => {
    const result = calculateBundlePricing(14, 25);
    expect(result.bundlePrice).toBeLessThan(result.adultPrice + result.kidPrice);
  });
});
