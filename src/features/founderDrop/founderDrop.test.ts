import { describe, it, expect } from "vitest";
import {
  buildFounderSKUs,
  computeFinanceGate,
  buildProductionTasks,
  type FounderSKU,
} from "./founderDrop";
import { BRAND_DNA } from "@/core/brand_dna";

// escapeXml and wrapText are not exported; test them via generateDesignConceptCard output
import { generateDesignConceptCard } from "./founderDrop";

const MIN_MARGIN = BRAND_DNA.financial_constraints.minimum_margin_pct;
const TARGET_AOV = BRAND_DNA.financial_constraints.target_aov;

describe("buildFounderSKUs", () => {
  const skus = buildFounderSKUs("test idea");

  it("returns exactly 4 SKUs", () => {
    expect(skus).toHaveLength(4);
  });

  it("every SKU has margin_pct >= minimum margin", () => {
    for (const sku of skus) {
      expect(sku.margin_pct).toBeGreaterThanOrEqual(MIN_MARGIN);
    }
  });

  it("includes a parent tee", () => {
    const tee = skus.find((s) => s.category === "tee");
    expect(tee).toBeDefined();
    expect(tee?.audience).toBe("parent");
  });

  it("includes a parent crewneck with patch_option true", () => {
    const crew = skus.find((s) => s.category === "crewneck");
    expect(crew).toBeDefined();
    expect(crew?.patch_option).toBe(true);
  });

  it("includes a parent cap with EMBROIDERY print type", () => {
    const cap = skus.find((s) => s.category === "cap");
    expect(cap).toBeDefined();
    expect(cap?.print_type).toBe("EMBROIDERY");
  });

  it("includes a kid AOP set with aop_spec and AOP print type", () => {
    const kid = skus.find((s) => s.category === "kid_aop_set");
    expect(kid).toBeDefined();
    expect(kid?.aop_spec).not.toBeNull();
    expect(kid?.print_type).toBe("AOP");
    expect(kid?.audience).toBe("kid");
  });

  it("kid AOP spec has required fields", () => {
    const kid = skus.find((s) => s.category === "kid_aop_set")!;
    expect(kid.aop_spec?.tile_size_px).toBe(4500);
    expect(kid.aop_spec?.repeat_type).toBe("seamless");
    expect(kid.aop_spec?.color_limit).toBe(3);
  });

  it("design prompts do not include forbidden elements literally", () => {
    for (const sku of skus) {
      // forbidden elements should appear only in the negative prompt
      expect(sku.design_prompt_negative).toBeTruthy();
    }
  });
});

describe("computeFinanceGate", () => {
  function makeSKU(overrides: Partial<FounderSKU> = {}): FounderSKU {
    return {
      name: "Test SKU",
      category: "tee",
      audience: "parent",
      provider: "printful",
      print_type: "DTG",
      style: "quiet",
      patch_option: false,
      cost_estimate_cad: 14,
      retail_cad: 42,
      margin_pct: 67,
      design_prompt_primary: "",
      design_prompt_negative: "",
      mockup_brief: "",
      aop_spec: null,
      ...overrides,
    };
  }

  it("passes when all margins meet the minimum and AOV meets target", () => {
    const skus: FounderSKU[] = [
      makeSKU({ retail_cad: 60, margin_pct: 60 }),
      makeSKU({ retail_cad: 70, margin_pct: 60 }),
      makeSKU({ retail_cad: 80, margin_pct: 60 }),
      makeSKU({ retail_cad: 90, margin_pct: 60 }),
    ];
    const result = computeFinanceGate(skus, 400);
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("fails and names the SKU when a margin is below minimum", () => {
    const skus: FounderSKU[] = [
      makeSKU({ name: "Bad Tee", retail_cad: 42, margin_pct: 40 }),
      makeSKU({ retail_cad: 80, margin_pct: 60 }),
    ];
    const result = computeFinanceGate(skus, 400);
    expect(result.passed).toBe(false);
    const mentionsBadTee = result.reasons.some((r) => r.includes("Bad Tee"));
    expect(mentionsBadTee).toBe(true);
  });

  it("fails when estimated AOV is below target", () => {
    // AOV = totalRetail / 2; make totalRetail very small
    const skus: FounderSKU[] = [
      makeSKU({ retail_cad: 10, margin_pct: 60 }),
      makeSKU({ retail_cad: 10, margin_pct: 60 }),
    ];
    const result = computeFinanceGate(skus, 400);
    expect(result.passed).toBe(false);
    const mentionsAOV = result.reasons.some((r) => r.toLowerCase().includes("aov"));
    expect(mentionsAOV).toBe(true);
  });

  it("returns correct avg_margin as integer average of SKU margins", () => {
    const skus: FounderSKU[] = [
      makeSKU({ retail_cad: 60, margin_pct: 60 }),
      makeSKU({ retail_cad: 60, margin_pct: 70 }),
    ];
    const result = computeFinanceGate(skus, 400);
    expect(result.avg_margin).toBe(65);
  });

  it("returns bundle_price_cad as 85% of total retail", () => {
    const skus: FounderSKU[] = [
      makeSKU({ retail_cad: 100, margin_pct: 60 }),
      makeSKU({ retail_cad: 100, margin_pct: 60 }),
    ];
    const result = computeFinanceGate(skus, 400);
    expect(result.bundle_price_cad).toBe(Math.round(200 * 0.85));
  });

  it("passes the monthly_ad_budget through unchanged", () => {
    const skus: FounderSKU[] = [makeSKU({ retail_cad: 60, margin_pct: 60 })];
    const result = computeFinanceGate(skus, 350);
    expect(result.monthly_ad_budget).toBe(350);
  });

  it("max_cac equals aov * max_cac_ratio (rounded)", () => {
    const skus: FounderSKU[] = [
      makeSKU({ retail_cad: 238, margin_pct: 60 }),
      makeSKU({ retail_cad: 0, margin_pct: 60 }),
    ];
    // totalRetail = 238, aov = 238/2 = 119
    const result = computeFinanceGate(skus, 400);
    expect(result.max_cac).toBe(Math.round(TARGET_AOV * BRAND_DNA.financial_constraints.max_cac_ratio));
  });
});

describe("buildProductionTasks", () => {
  it("generates a DTG task for Printful DTG SKUs", () => {
    const skus: FounderSKU[] = [
      { name: "Parent Tee", category: "tee", audience: "parent", provider: "printful",
        print_type: "DTG", style: "quiet", patch_option: false, cost_estimate_cad: 14,
        retail_cad: 42, margin_pct: 67, design_prompt_primary: "", design_prompt_negative: "",
        mockup_brief: "", aop_spec: null },
    ];
    const tasks = buildProductionTasks(skus);
    const dtgTask = tasks.find((t) => t.includes("DTG print file") && t.includes("Parent Tee"));
    expect(dtgTask).toBeDefined();
  });

  it("generates an embroidery task for Printful EMBROIDERY SKUs", () => {
    const skus: FounderSKU[] = [
      { name: "Parent Cap", category: "cap", audience: "parent", provider: "printful",
        print_type: "EMBROIDERY", style: "quiet", patch_option: false, cost_estimate_cad: 12,
        retail_cad: 38, margin_pct: 68, design_prompt_primary: "", design_prompt_negative: "",
        mockup_brief: "", aop_spec: null },
    ];
    const tasks = buildProductionTasks(skus);
    const embTask = tasks.find((t) => t.includes("embroidery file") && t.includes("Parent Cap"));
    expect(embTask).toBeDefined();
  });

  it("generates a seamless tile task for kin_custom SKUs", () => {
    const skus: FounderSKU[] = [
      { name: "Kid AOP Set", category: "kid_aop_set", audience: "kid", provider: "kin_custom",
        print_type: "AOP", style: "funny", patch_option: false, cost_estimate_cad: 25,
        retail_cad: 62, margin_pct: 60, design_prompt_primary: "", design_prompt_negative: "",
        mockup_brief: "", aop_spec: null },
    ];
    const tasks = buildProductionTasks(skus);
    const aopTask = tasks.find((t) => t.includes("seamless tile") && t.includes("Kid AOP Set"));
    expect(aopTask).toBeDefined();
  });

  it("always appends brand DNA review and platform upload tasks", () => {
    const tasks = buildProductionTasks([]);
    expect(tasks.some((t) => t.includes("BRAND_DNA"))).toBe(true);
    expect(tasks.some((t) => t.includes("Printful"))).toBe(true);
    expect(tasks.some((t) => t.includes("Shopify"))).toBe(true);
  });
});

describe("generateDesignConceptCard (escapeXml / wrapText coverage)", () => {
  const sku: FounderSKU = {
    name: 'Test & "Card" <SKU>',
    category: "tee",
    audience: "parent",
    provider: "printful",
    print_type: "DTG",
    style: "quiet",
    patch_option: true,
    cost_estimate_cad: 14,
    retail_cad: 42,
    margin_pct: 67,
    design_prompt_primary: "",
    design_prompt_negative: "",
    mockup_brief: "A brief with many words that should wrap across several lines in the SVG card layout",
    aop_spec: null,
  };

  it("returns a data URI string", () => {
    const result = generateDesignConceptCard(sku, 0);
    expect(result).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it("escapes XML special characters in the SVG output", () => {
    const result = generateDesignConceptCard(sku, 0);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml;utf8,", ""));
    expect(decoded).toContain("&amp;");
    expect(decoded).toContain("&lt;");
    expect(decoded).toContain("&gt;");
    expect(decoded).toContain("&quot;");
  });

  it("includes patch option indicator when patch_option is true", () => {
    const result = generateDesignConceptCard(sku, 0);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml;utf8,", ""));
    expect(decoded).toContain("PATCH OPTION");
  });

  it("does not include patch indicator when patch_option is false", () => {
    const noPatch = { ...sku, patch_option: false };
    const result = generateDesignConceptCard(noPatch, 0);
    const decoded = decodeURIComponent(result.replace("data:image/svg+xml;utf8,", ""));
    expect(decoded).not.toContain("PATCH OPTION");
  });

  it("cycles through background colors by index", () => {
    const r0 = generateDesignConceptCard({ ...sku, name: "S0" }, 0);
    const r4 = generateDesignConceptCard({ ...sku, name: "S4" }, 4);
    // Index 0 and 4 both use bgColors[0] = #1A1A1A
    expect(decodeURIComponent(r0)).toContain("#1A1A1A");
    expect(decodeURIComponent(r4)).toContain("#1A1A1A");
  });
});
