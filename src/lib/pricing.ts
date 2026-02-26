// DADZCO Pricing Engine
// Target margin: 58.5%, Buffer: 12% for returns/shipping, Personalization: +15 CAD

/** Format a number as Canadian dollars (e.g. "45,00 $ CAD") */
export function formatCAD(amount: number, decimals = 2): string {
  return `${amount.toFixed(decimals)} $ CAD`;
}

export const PRICING_CONFIG = {
  targetMargin: 0.585,
  returnBuffer: 0.12,
  personalizationAddon: 15,
  heroLimitedEditionQty: 50,
};

export interface SKUPricing {
  sku: string;
  baseCost: number;
  bufferedCost: number;
  suggestedRetail: number;
  margin: number;
  marginPct: number;
  withPersonalization: number;
}

export interface BundlePricing {
  adultPrice: number;
  kidPrice: number;
  bundlePrice: number;
  bundleSavings: number;
  withPersonalization: number;
}

export function calculateSKUPricing(baseCost: number, customRetail?: number): SKUPricing {
  const bufferedCost = baseCost * (1 + PRICING_CONFIG.returnBuffer);
  const suggestedRetail = customRetail ?? Math.ceil(bufferedCost / (1 - PRICING_CONFIG.targetMargin));
  const margin = suggestedRetail - bufferedCost;
  const marginPct = suggestedRetail > 0 ? margin / suggestedRetail : 0;

  return {
    sku: "",
    baseCost,
    bufferedCost: Math.round(bufferedCost * 100) / 100,
    suggestedRetail,
    margin: Math.round(margin * 100) / 100,
    marginPct: Math.round(marginPct * 1000) / 10,
    withPersonalization: suggestedRetail + PRICING_CONFIG.personalizationAddon,
  };
}

export function calculateBundlePricing(adultCost: number, kidCost: number): BundlePricing {
  const adultPricing = calculateSKUPricing(adultCost);
  const kidPricing = calculateSKUPricing(kidCost);
  const fullPrice = adultPricing.suggestedRetail + kidPricing.suggestedRetail;
  const bundleDiscount = 0.1; // 10% bundle discount
  const bundlePrice = Math.ceil(fullPrice * (1 - bundleDiscount));

  return {
    adultPrice: adultPricing.suggestedRetail,
    kidPrice: kidPricing.suggestedRetail,
    bundlePrice,
    bundleSavings: fullPrice - bundlePrice,
    withPersonalization: bundlePrice + PRICING_CONFIG.personalizationAddon,
  };
}
