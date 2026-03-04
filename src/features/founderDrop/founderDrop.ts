import { BRAND_DNA } from "@/core/brand_dna";

/* ────────── Fixed MVP SKUs ────────── */

export interface FounderSKU {
  name: string;
  category: string;
  audience: "parent" | "kid";
  provider: "printful" | "kin_custom";
  print_type: "DTG" | "EMBROIDERY" | "AOP";
  style: "quiet" | "funny";
  patch_option: boolean;
  cost_estimate_cad: number;
  retail_cad: number;
  margin_pct: number;
  design_prompt_primary: string;
  design_prompt_negative: string;
  mockup_brief: string;
  aop_spec: null | {
    tile_size_px: number;
    repeat_type: string;
    density_rule: string;
    panel_mapping: string[];
    seam_safety: string;
    color_limit: number;
  };
}

export interface FinanceVerdict {
  passed: boolean;
  avg_margin: number;
  aov_estimate: number;
  bundle_price_cad: number;
  monthly_ad_budget: number;
  max_cac: number;
  reasons: string[];
}

export interface FounderDropResult {
  name: string;
  theme: string;
  season: string;
  pack_type: string;
  skus: FounderSKU[];
  finance: FinanceVerdict;
  production_tasks: string[];
  conceptCards: string[];
}

function enforceMargin(cost: number, retail: number): { retail_cad: number; margin_pct: number } {
  const minRetail = cost / (1 - BRAND_DNA.financial_constraints.minimum_margin_pct / 100);
  const finalRetail = Math.max(retail, Math.ceil(minRetail));
  const margin = Math.round(((finalRetail - cost) / finalRetail) * 100);
  return { retail_cad: finalRetail, margin_pct: margin };
}

export function buildFounderSKUs(idea: string): FounderSKU[] {
  const theme = "Aviation & Wonders";
  const neg = BRAND_DNA.forbidden_elements.join(", ");

  const tee = enforceMargin(14, 42);
  const crew = enforceMargin(21, 59);
  const cap = enforceMargin(12, 38);
  const kid = enforceMargin(25, 62);

  return [
    {
      name: "Parent Tee",
      category: "tee",
      audience: "parent",
      provider: "printful",
      print_type: "DTG",
      style: "quiet",
      patch_option: false,
      cost_estimate_cad: 14,
      ...tee,
      mockup_brief: `Minimal ${theme} tee — centered chest graphic, aviation heritage linework, 70%+ negative space.`,
      design_prompt_primary: `Minimal premium ${theme} parent tee. Centered chest graphic, architectural linework, aviation heritage motif. 70%+ negative space. Noir profond base (#1A1A1A), ivoire details. No text unless brand name.`,
      design_prompt_negative: neg + ", text heavy, busy layout, neon colors",
      aop_spec: null,
    },
    {
      name: "Parent Crewneck",
      category: "crewneck",
      audience: "parent",
      provider: "printful",
      print_type: "DTG",
      style: "quiet",
      patch_option: true,
      cost_estimate_cad: 21,
      ...crew,
      mockup_brief: `Premium ${theme} crewneck — left-chest emblem, aviation-inspired patch on lower front, ivoire/bronze palette.`,
      design_prompt_primary: `Premium ${theme} crewneck. Left-chest emblem or subtle graphic. Aviation-inspired patch on lower front. Ivoire chaud base (#F4F1EC) with bronze heritage (#6E4B3A) accents. Architectural precision. 70%+ negative space.`,
      design_prompt_negative: neg + ", loud graphics, centered large print",
      aop_spec: null,
    },
    {
      name: "Parent Cap",
      category: "cap",
      audience: "parent",
      provider: "printful",
      print_type: "EMBROIDERY",
      style: "quiet",
      patch_option: false,
      cost_estimate_cad: 12,
      ...cap,
      mockup_brief: `${theme} dad cap — small embroidered aviation emblem (max 3cm), noir or ivoire base.`,
      design_prompt_primary: `${theme} dad cap. Front panel: small embroidered aviation emblem (max 3cm). Side: minimal brand wordmark. Colors: noir profond (#1A1A1A) or ivoire chaud (#F4F1EC). Clean, understated.`,
      design_prompt_negative: neg + ", large embroidery, all-over print, snapback style",
      aop_spec: null,
    },
    {
      name: "Kid AOP Set",
      category: "kid_aop_set",
      audience: "kid",
      provider: "kin_custom",
      print_type: "AOP",
      style: "funny",
      patch_option: false,
      cost_estimate_cad: 25,
      ...kid,
      mockup_brief: `Seamless ${theme} all-over pattern for kid set — narrative aviation motifs, 3-color max, sophisticated anti-kitsch.`,
      design_prompt_primary: `Seamless ${theme} all-over pattern for kid set. Narrative aviation motifs (paper planes, clouds, compass roses, stars) in a sophisticated, premium style. 3-color max: noir profond, ivoire chaud, bronze heritage. Generous negative space, no childish graphics. Repeat tile 4500px seamless.`,
      design_prompt_negative: neg + ", childish, bright primary colors, thick outlines, comic style",
      aop_spec: {
        tile_size_px: 4500,
        repeat_type: "seamless",
        density_rule: "generous_negative_space",
        panel_mapping: ["front", "back", "sleeves", "hood", "collar"],
        seam_safety: "keep key motifs away from seams",
        color_limit: 3,
      },
    },
  ];
}

/* ────────── Finance Gate ────────── */

export function computeFinanceGate(skus: FounderSKU[], adBudget: number): FinanceVerdict {
  const reasons: string[] = [];
  const margins = skus.map((s) => s.margin_pct);
  const avg = Math.round(margins.reduce((a, b) => a + b, 0) / margins.length);
  const totalRetail = skus.reduce((a, s) => a + s.retail_cad, 0);
  const bundlePrice = Math.round(totalRetail * 0.85);
  const aov = Math.round(totalRetail / 2);

  for (const s of skus) {
    if (s.margin_pct < BRAND_DNA.financial_constraints.minimum_margin_pct) {
      reasons.push(`${s.name} margin ${s.margin_pct}% < ${BRAND_DNA.financial_constraints.minimum_margin_pct}%`);
    }
  }
  if (aov < BRAND_DNA.financial_constraints.target_aov) {
    reasons.push(`Estimated AOV ${aov} CAD < target ${BRAND_DNA.financial_constraints.target_aov} CAD`);
  }

  const maxCac = Math.round(aov * BRAND_DNA.financial_constraints.max_cac_ratio);

  return {
    passed: reasons.length === 0,
    avg_margin: avg,
    aov_estimate: aov,
    bundle_price_cad: bundlePrice,
    monthly_ad_budget: adBudget,
    max_cac: maxCac,
    reasons,
  };
}

/* ────────── Production Tasks ────────── */

export function buildProductionTasks(skus: FounderSKU[]): string[] {
  const tasks: string[] = [];
  for (const s of skus) {
    if (s.provider === "printful") {
      tasks.push(
        `Generate ${s.print_type === "EMBROIDERY" ? "embroidery file" : "DTG print file"} for "${s.name}" via Leonardo (4500×5400 PNG 300DPI)`
      );
    } else {
      tasks.push(`Generate seamless tile for "${s.name}" via Kin Custom (4500×4500 seamless + panel templates)`);
    }
  }
  tasks.push("Review all files against BRAND_DNA forbidden elements");
  tasks.push("Upload Printful files to Printful dashboard");
  tasks.push("Upload Kin Custom tiles + panel mapping");
  tasks.push("Set up Shopify product listings with pricing");
  tasks.push("Create launch content (Instagram + TikTok)");
  return tasks;
}

/* ────────── Local Concept Card SVG ────────── */

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

export function generateDesignConceptCard(sku: FounderSKU, index: number): string {
  const W = 400;
  const H = 560;
  const bgColors = ["#1A1A1A", "#F4F1EC", "#2C2418", "#1E1E2E"];
  const fgColors = ["#F4F1EC", "#1A1A1A", "#F4F1EC", "#F4F1EC"];
  const bg = bgColors[index % bgColors.length];
  const fg = fgColors[index % fgColors.length];
  const accent = "#6E4B3A";

  const providerLabel = sku.provider === "kin_custom" ? "KIN CUSTOM" : "PRINTFUL";
  const briefLines = wrapText(sku.mockup_brief, 44);
  const briefSvg = briefLines
    .map(
      (line, li) =>
        `<text x="30" y="${320 + li * 16}" font-family="sans-serif" font-size="11" fill="${fg}" fill-opacity="0.7">${escapeXml(
          line
        )}</text>`
    )
    .join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}" rx="12"/>
  <rect x="20" y="20" width="${W - 40}" height="3" fill="${accent}" rx="1.5"/>
  <text x="30" y="58" font-family="sans-serif" font-size="20" font-weight="bold" fill="${fg}">${escapeXml(sku.name)}</text>
  <text x="30" y="80" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.4" letter-spacing="2">${escapeXml(
    sku.category.toUpperCase()
  )} · ${escapeXml(sku.style.toUpperCase())}</text>
  <rect x="30" y="95" width="110" height="24" rx="4" fill="${accent}" fill-opacity="0.25"/>
  <text x="85" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold" fill="${accent}">${escapeXml(
    providerLabel
  )}</text>
  <rect x="150" y="95" width="65" height="24" rx="4" fill="${fg}" fill-opacity="0.08"/>
  <text x="182" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.5">${escapeXml(
    sku.print_type
  )}</text>
  <rect x="225" y="95" width="80" height="24" rx="4" fill="${fg}" fill-opacity="0.08"/>
  <text x="265" y="112" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${fg}" fill-opacity="0.5">${
    sku.retail_cad
  } CAD · ${sku.margin_pct}%</text>
  <rect x="30" y="135" width="${W - 60}" height="150" rx="8" fill="${fg}" fill-opacity="0.04" stroke="${fg}" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="6 3"/>
  <text x="${W / 2}" y="200" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${fg}" fill-opacity="0.25">DESIGN ZONE</text>
  <text x="${W / 2}" y="220" text-anchor="middle" font-family="sans-serif" font-size="9" fill="${fg}" fill-opacity="0.15">Production image placeholder</text>
  <text x="30" y="305" font-family="sans-serif" font-size="9" fill="${fg}" fill-opacity="0.3" letter-spacing="1.5">BRIEF</text>
  ${briefSvg}
  ${sku.patch_option ? `<text x="30" y="${H - 60}" font-family="sans-serif" font-size="10" fill="${accent}">⊕ PATCH OPTION</text>` : ""}
  <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="${fg}" fill-opacity="0.12" letter-spacing="4">DESIGN CONCEPT</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
