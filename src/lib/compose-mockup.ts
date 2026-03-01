/**
 * Client-side mockup compositor using SVG data URLs.
 * Draws garment flatlay templates with overlay text + CONCEPT ONLY watermark.
 * NO Canvas, NO Image(), NO roundRect — fully deterministic SVG.
 */

type GarmentType = "tee" | "crewneck" | "hoodie" | "cap";
type Placement = "center" | "left_chest";

interface ComposeMockupOptions {
  garment: GarmentType;
  skuName: string;
  skuType: "quiet" | "funny" | "hero";
  placement: Placement;
  palette?: string[];
  designImageUrl?: string | null;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function getGarmentForSku(skuType: "quiet" | "funny" | "hero", index: number): GarmentType {
  if (skuType === "hero") return "hoodie";
  const garments: GarmentType[] = ["tee", "crewneck", "hoodie", "cap"];
  return garments[index % garments.length];
}

export async function composeMockup(options: ComposeMockupOptions): Promise<string> {
  const { garment, skuName, skuType, placement } = options;

  const W = 800;
  const H = 1000;
  const label = escapeXml(truncate(skuName, 18));
  const garmentLabel = escapeXml(`${garment.toUpperCase()} · ${placement === "center" ? "Center" : "Left Chest"}`);
  const typeLabel = escapeXml(skuType.toUpperCase());
  const variantTag = placement === "center" ? "VARIANT A" : "VARIANT B";

  const bg = placement === "center" ? "#F7F2E8" : "#E7E4DE";
  const garmentFill = "#CBBFA9";

  const pb = placement === "center"
    ? { x: 250, y: 320, w: 300, h: 260 }
    : { x: 200, y: 200, w: 160, h: 140 };

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="170" y="140" width="460" height="680" rx="22" ry="22"
        fill="${garmentFill}" stroke="#0B1B2B" stroke-width="2"/>
  <rect x="${pb.x}" y="${pb.y}" width="${pb.w}" height="${pb.h}" rx="6" ry="6"
        fill="#0B1B2B" fill-opacity="0.08" stroke="#0B1B2B" stroke-width="1.5" stroke-dasharray="6 3"/>
  <text x="${pb.x + pb.w / 2}" y="${pb.y + pb.h / 2 - 8}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="16" font-weight="bold" fill="#0B1B2B">
    ${label}
  </text>
  <text x="${pb.x + pb.w / 2}" y="${pb.y + pb.h / 2 + 16}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="11" fill="#0B1B2B" fill-opacity="0.5">
    ${typeLabel}
  </text>
  <text x="${W / 2}" y="60"
        text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold"
        fill="#0B1B2B" fill-opacity="0.7">
    ${variantTag}
  </text>
  <text x="20" y="${H - 60}"
        font-family="sans-serif" font-size="11" fill="#0B1B2B" fill-opacity="0.7">
    ${garmentLabel}
  </text>
  <text x="${W / 2}" y="${H - 40}"
        text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold"
        fill="#0B1B2B" fill-opacity="0.35">
    CONCEPT ONLY
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export function getGarmentType(skuType: "quiet" | "funny" | "hero", skuIndex: number): GarmentType {
  return getGarmentForSku(skuType, skuIndex);
}

export type { GarmentType, Placement, ComposeMockupOptions };
