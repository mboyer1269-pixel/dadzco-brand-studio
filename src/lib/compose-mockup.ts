/**
 * Client-side mockup compositor using Canvas API.
 * Draws garment flatlay templates with overlay text/design + CONCEPT ONLY watermark.
 * NO AI, NO Leonardo — fully deterministic.
 */

const BRAND_PALETTE = {
  sable: "#CBBFA9",
  brume: "#E7E4DE",
  navy: "#0B1B2B",
  creme: "#F7F2E8",
  lavande: "#C9C3D6",
};

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

// Print area definitions relative to 800x1000 canvas
const PRINT_AREAS: Record<GarmentType, Record<Placement, { x: number; y: number; w: number; h: number }>> = {
  tee: {
    center: { x: 250, y: 300, w: 300, h: 300 },
    left_chest: { x: 220, y: 250, w: 120, h: 120 },
  },
  crewneck: {
    center: { x: 240, y: 320, w: 320, h: 280 },
    left_chest: { x: 210, y: 270, w: 130, h: 130 },
  },
  hoodie: {
    center: { x: 230, y: 340, w: 340, h: 280 },
    left_chest: { x: 200, y: 290, w: 130, h: 130 },
  },
  cap: {
    center: { x: 250, y: 280, w: 300, h: 200 },
    left_chest: { x: 280, y: 300, w: 140, h: 140 },
  },
};

function getGarmentForSku(skuType: "quiet" | "funny" | "hero", index: number): GarmentType {
  if (skuType === "hero") return "hoodie";
  const garments: GarmentType[] = ["tee", "crewneck", "hoodie", "cap"];
  return garments[index % garments.length];
}

function drawGarmentSilhouette(ctx: CanvasRenderingContext2D, garment: GarmentType, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = BRAND_PALETTE.navy;
  ctx.lineWidth = 2;

  switch (garment) {
    case "tee":
      ctx.beginPath();
      // T-shirt silhouette
      ctx.moveTo(280, 140);
      ctx.lineTo(200, 180); // left shoulder
      ctx.lineTo(140, 350); // left sleeve
      ctx.lineTo(200, 350); // sleeve cuff
      ctx.lineTo(220, 260); // underarm
      ctx.lineTo(220, 780); // left hem
      ctx.lineTo(580, 780); // bottom
      ctx.lineTo(580, 260); // right side
      ctx.lineTo(600, 350); // right underarm
      ctx.lineTo(660, 350); // right sleeve
      ctx.lineTo(600, 180); // right shoulder
      ctx.lineTo(520, 140); // right collar
      ctx.quadraticCurveTo(400, 110, 280, 140); // collar
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case "crewneck":
      ctx.beginPath();
      ctx.moveTo(290, 150);
      ctx.lineTo(180, 200);
      ctx.lineTo(100, 400); // longer sleeve
      ctx.lineTo(170, 410);
      ctx.lineTo(210, 280);
      ctx.lineTo(210, 800);
      ctx.lineTo(590, 800);
      ctx.lineTo(590, 280);
      ctx.lineTo(630, 410);
      ctx.lineTo(700, 400);
      ctx.lineTo(620, 200);
      ctx.lineTo(510, 150);
      ctx.quadraticCurveTo(400, 125, 290, 150);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Cuff lines
      ctx.strokeStyle = BRAND_PALETTE.sable;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(210, 770); ctx.lineTo(590, 770);
      ctx.stroke();
      break;

    case "hoodie":
      ctx.beginPath();
      ctx.moveTo(300, 130);
      ctx.lineTo(170, 190);
      ctx.lineTo(80, 420);
      ctx.lineTo(160, 430);
      ctx.lineTo(200, 290);
      ctx.lineTo(200, 820);
      ctx.lineTo(600, 820);
      ctx.lineTo(600, 290);
      ctx.lineTo(640, 430);
      ctx.lineTo(720, 420);
      ctx.lineTo(630, 190);
      ctx.lineTo(500, 130);
      ctx.quadraticCurveTo(400, 100, 300, 130);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Hood
      ctx.beginPath();
      ctx.strokeStyle = BRAND_PALETTE.navy;
      ctx.lineWidth = 2;
      ctx.moveTo(300, 130);
      ctx.quadraticCurveTo(250, 50, 330, 40);
      ctx.quadraticCurveTo(400, 30, 470, 40);
      ctx.quadraticCurveTo(550, 50, 500, 130);
      ctx.stroke();
      // Kangaroo pocket
      ctx.strokeStyle = BRAND_PALETTE.sable;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(280, 550, 240, 120, 10);
      ctx.stroke();
      break;

    case "cap":
      ctx.beginPath();
      // Cap dome
      ctx.ellipse(400, 400, 220, 180, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Brim
      ctx.beginPath();
      ctx.ellipse(400, 400, 260, 40, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = darkenColor(color, 15);
      ctx.fill();
      ctx.strokeStyle = BRAND_PALETTE.navy;
      ctx.stroke();
      break;
  }
}

function darkenColor(hex: string, pct: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * pct / 100));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * pct / 100));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * pct / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

function getPaletteColor(palette: string[], index: number): string {
  const colorMap: Record<string, string> = BRAND_PALETTE;
  const key = palette[index % palette.length];
  return colorMap[key] || BRAND_PALETTE.creme;
}

function drawOverlayBadge(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; w: number; h: number },
  skuName: string,
  skuType: "quiet" | "funny" | "hero",
  palette: string[],
) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;

  if (skuType === "quiet") {
    // Geometric echo motif - concentric circles
    const baseColor = getPaletteColor(palette, 0);
    for (let i = 3; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + i * 22, 0, Math.PI * 2);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + i * 0.15;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Small text
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.fillStyle = BRAND_PALETTE.navy;
    ctx.textAlign = "center";
    ctx.fillText(skuName.split(" ").slice(0, 2).join(" "), cx, cy + area.h / 2 + 20);
  } else if (skuType === "funny") {
    // Typographic badge
    ctx.save();
    ctx.fillStyle = BRAND_PALETTE.navy;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(area.x + 10, area.y + 10, area.w - 20, area.h - 20, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BRAND_PALETTE.creme;
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Word wrap
    const words = skuName.split(" ");
    const lineHeight = 22;
    const startY = cy - ((words.length > 3 ? 2 : words.length - 1) * lineHeight) / 2;
    let line = "";
    let lineNum = 0;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > area.w - 40) {
        ctx.fillText(line, cx, startY + lineNum * lineHeight);
        line = word;
        lineNum++;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, startY + lineNum * lineHeight);
    ctx.restore();
  } else {
    // Hero - premium badge with gradient-like effect
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(area.w, area.h) / 2 - 10, 0, Math.PI * 2);
    ctx.fillStyle = BRAND_PALETTE.navy;
    ctx.fill();
    ctx.strokeStyle = BRAND_PALETTE.sable;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = BRAND_PALETTE.creme;
    ctx.font = "bold 11px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ÉDITION", cx, cy - 12);
    ctx.fillText("LIMITÉE", cx, cy + 4);
    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillStyle = BRAND_PALETTE.sable;
    ctx.fillText("×50", cx, cy + 22);
    ctx.restore();
  }
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = BRAND_PALETTE.navy;
  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CONCEPT ONLY", width / 2, height - 40);
  // Diagonal watermark across image
  ctx.globalAlpha = 0.06;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = "bold 60px 'Inter', sans-serif";
  ctx.fillText("CONCEPT ONLY", 0, 0);
  ctx.restore();
}

export async function composeMockup(options: ComposeMockupOptions): Promise<string> {
  const { garment, skuName, skuType, placement, palette = ["sable", "navy", "creme"], designImageUrl } = options;

  const W = 800;
  const H = 1000;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BRAND_PALETTE.creme;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.strokeStyle = BRAND_PALETTE.brume;
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Garment color based on palette
  const garmentColor = getPaletteColor(palette, 1) === BRAND_PALETTE.navy
    ? BRAND_PALETTE.brume
    : getPaletteColor(palette, 1);
  drawGarmentSilhouette(ctx, garment, garmentColor);

  // Print area
  const area = PRINT_AREAS[garment][placement];

  if (designImageUrl) {
    // Draw existing design image
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = designImageUrl;
      });
      ctx.drawImage(img, area.x, area.y, area.w, area.h);
    } catch {
      // Fallback to badge if image fails
      drawOverlayBadge(ctx, area, skuName, skuType, palette);
    }
  } else {
    drawOverlayBadge(ctx, area, skuName, skuType, palette);
  }

  // Label
  ctx.fillStyle = BRAND_PALETTE.navy;
  ctx.globalAlpha = 0.7;
  ctx.font = "11px 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${garment.toUpperCase()} · ${placement === "center" ? "Center" : "Left Chest"}`, 20, H - 60);
  ctx.globalAlpha = 1;

  // Watermark
  drawWatermark(ctx, W, H);

  return canvas.toDataURL("image/png");
}

export function getGarmentType(skuType: "quiet" | "funny" | "hero", skuIndex: number): GarmentType {
  return getGarmentForSku(skuType, skuIndex);
}

export type { GarmentType, Placement, ComposeMockupOptions };
