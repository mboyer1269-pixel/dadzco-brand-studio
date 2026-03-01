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

  // Placement box coords
  const pb = placement === "center"
    ? { x: 250, y: 320, w: 300, h: 260 }
    : { x: 240, y: 260, w: 160, h: 140 };

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#F7F2E8"/>
  <!-- Grid -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E7E4DE" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <!-- Garment silhouette -->
  <rect x="170" y="140" width="460" height="680" rx="22" ry="22"
        fill="#E7E4DE" stroke="#0B1B2B" stroke-width="2"/>
  <!-- Placement box -->
  <rect x="${pb.x}" y="${pb.y}" width="${pb.w}" height="${pb.h}" rx="6" ry="6"
        fill="#0B1B2B" fill-opacity="0.08" stroke="#0B1B2B" stroke-width="1.5" stroke-dasharray="6 3"/>
  <!-- SKU name in placement box -->
  <text x="${pb.x + pb.w / 2}" y="${pb.y + pb.h / 2 - 8}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, sans-serif" font-size="16" font-weight="bold" fill="#0B1B2B">
    ${label}
  </text>
  <!-- Type badge -->
  <text x="${pb.x + pb.w / 2}" y="${pb.y + pb.h / 2 + 16}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, sans-serif" font-size="11" fill="#CBBFA9">
    ${typeLabel}
  </text>
  <!-- Placement label -->
  <text x="${pb.x + pb.w / 2}" y="${pb.y + pb.h + 22}"
        text-anchor="middle" font-family="Inter, sans-serif" font-size="10" fill="#0B1B2B" fill-opacity="0.5">
    ${placement === "center" ? "▣ CENTER" : "◧ LEFT CHEST"}
  </text>
  <!-- Garment info label -->
  <text x="20" y="${H - 60}"
        font-family="Inter, sans-serif" font-size="11" fill="#0B1B2B" fill-opacity="0.7">
    ${garmentLabel}
  </text>
  <!-- Watermark bottom -->
  <text x="${W / 2}" y="${H - 40}"
        text-anchor="middle" font-family="Inter, sans-serif" font-size="24" font-weight="bold"
        fill="#0B1B2B" fill-opacity="0.35">
    CONCEPT ONLY
  </text>
  <!-- Watermark diagonal -->
  <text x="${W / 2}" y="${H / 2}"
        text-anchor="middle" font-family="Inter, sans-serif" font-size="60" font-weight="bold"
        fill="#0B1B2B" fill-opacity="0.06"
        transform="rotate(-30 ${W / 2} ${H / 2})">
    CONCEPT ONLY
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export function getGarmentType(skuType: "quiet" | "funny" | "hero", skuIndex: number): GarmentType {
  return getGarmentForSku(skuType, skuIndex);
}

export type { GarmentType, Placement, ComposeMockupOptions };
