import jsPDF from "jspdf";
import { formatCAD } from "@/lib/pricing";

// Re-use types from RoundTable
interface SKUStory {
  mythology: string;
  punchlines: string[];
  shopify_description: string;
  tiktok_caption: string;
  instagram_caption: string;
  hero_image_brief: string;
}

interface SKU {
  name: string;
  type: "quiet" | "funny";
  products: string[];
  placement: string;
  adult_base_cost: number;
  kid_base_cost: number;
  adult_retail: number;
  kid_retail: number;
  bundle_price: number;
  bundle_with_perso: number;
  margin_pct: number;
  mockup_brief: string;
  story: SKUStory;
}

interface Collection {
  name: string;
  theme: string;
  season: string;
  palette: string[];
  thank_you_note: string;
  agent_notes: Record<string, string>;
  skus: SKU[];
}

const AGENT_LABELS: Record<string, string> = {
  brand_strategy: "Brand Strategy Specialist",
  creative_director: "Creative & Mythology Director",
  artistic_designer: "Artistic Designer",
  pod_specialist: "POD Specialist",
  storytelling: "Storytelling Grok",
  growth: "Growth & Conversion Strategist",
  financial: "Financial Gatekeeper",
};

// Colors (DADZCO brand)
const C = {
  dark: [30, 41, 59] as [number, number, number],      // slate-800
  mid: [100, 116, 139] as [number, number, number],     // slate-500
  light: [226, 232, 240] as [number, number, number],   // slate-200
  bg: [248, 246, 243] as [number, number, number],      // warm cream
  accent: [42, 55, 71] as [number, number, number],     // brand navy
  white: [255, 255, 255] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addPage(doc: jsPDF): number {
  doc.addPage();
  return MARGIN;
}

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    return addPage(doc);
  }
  return y;
}

function drawHeader(doc: jsPDF, text: string, y: number, size = 14): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(...C.accent);
  doc.text(text, MARGIN, y);
  return y + size * 0.5 + 2;
}

function drawLabel(doc: jsPDF, label: string, x: number, y: number): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.mid);
  doc.text(label.toUpperCase(), x, y);
}

function drawBody(doc: jsPDF, text: string, x: number, y: number, maxW: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * 4;
}

function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

/** Load an image URL as base64 data URL, returns null on failure */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportCollectionPDF(
  collection: Collection,
  mockups: Record<string, string>, // "ci-si" -> url
  collectionIndex: number,
  onProgress?: (msg: string) => void
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Cover page ──────────────────────────────
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Brand header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.mid);
  doc.text("DADZCO | MUMZCO | APPAREL", PAGE_W / 2, 40, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...C.accent);
  doc.text(collection.name, PAGE_W / 2, 70, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...C.mid);
  const themeLines = doc.splitTextToSize(collection.theme, CONTENT_W - 20);
  doc.text(themeLines, PAGE_W / 2, 82, { align: "center" });

  // Season + Palette
  let coverY = 82 + themeLines.length * 5 + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.text(`Saison : ${collection.season}`, PAGE_W / 2, coverY, { align: "center" });
  coverY += 7;
  doc.text(`Palette : ${collection.palette.join(" · ")}`, PAGE_W / 2, coverY, { align: "center" });
  coverY += 7;
  doc.text(`${collection.skus?.length || 0} SKUs`, PAGE_W / 2, coverY, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...C.mid);
  doc.text("Généré par DADZCO Brand OS — Round Table", PAGE_W / 2, PAGE_H - 20, { align: "center" });
  doc.text(new Date().toLocaleDateString("fr-CA"), PAGE_W / 2, PAGE_H - 15, { align: "center" });

  // ── Agent Notes page ──────────────────────────────
  let y = addPage(doc);
  y = drawHeader(doc, "Notes des Agents", y, 16);
  y += 4;

  for (const [key, note] of Object.entries(collection.agent_notes || {})) {
    y = checkPage(doc, y, 25);
    drawLabel(doc, AGENT_LABELS[key] || key, MARGIN, y);
    y += 4;
    y = drawBody(doc, note, MARGIN, y, CONTENT_W);
    y += 4;
  }

  // Thank you note
  if (collection.thank_you_note) {
    y = checkPage(doc, y, 20);
    y = drawDivider(doc, y);
    drawLabel(doc, "📦 Thank You Note Packaging", MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.dark);
    const tyLines = doc.splitTextToSize(`"${collection.thank_you_note}"`, CONTENT_W);
    doc.text(tyLines, MARGIN, y);
    y += tyLines.length * 4 + 4;
  }

  // ── SKU pages ──────────────────────────────
  const skus = collection.skus || [];
  for (let si = 0; si < skus.length; si++) {
    const sku = skus[si];
    onProgress?.(`SKU ${si + 1}/${skus.length} : ${sku.name}`);

    y = addPage(doc);

    // SKU Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.accent);
    doc.text(`${si + 1}. ${sku.name}`, MARGIN, y);

    // Type badge
    const badgeText = sku.type === "quiet" ? "Quiet Luxury" : "Funny Premium";
    const badgeX = MARGIN + doc.getTextWidth(`${si + 1}. ${sku.name}`) + 4;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.mid);
    doc.text(`[ ${badgeText} ]`, badgeX, y);

    y += 6;

    // Placement
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.mid);
    const placementLines = doc.splitTextToSize(sku.placement, CONTENT_W);
    doc.text(placementLines, MARGIN, y);
    y += placementLines.length * 3.5 + 4;

    // Mockup image
    const mockupKey = `${collectionIndex}-${si}`;
    const mockupUrl = mockups[mockupKey];
    if (mockupUrl) {
      onProgress?.(`Chargement image ${sku.name}…`);
      const imgData = await loadImageAsBase64(mockupUrl);
      if (imgData) {
        y = checkPage(doc, y, 75);
        const imgW = Math.min(CONTENT_W * 0.6, 100);
        const imgX = MARGIN + (CONTENT_W - imgW) / 2;
        try {
          doc.addImage(imgData, "PNG", imgX, y, imgW, imgW * 0.75);
          y += imgW * 0.75 + 4;
        } catch {
          // Image format not supported, skip
        }
      }
    }

    // ── Pricing table ──────────────────────────────
    y = checkPage(doc, y, 30);
    drawLabel(doc, "TARIFICATION (CAD)", MARGIN, y);
    y += 5;

    const colW = CONTENT_W / 3;
    const priceData = [
      ["Coût adulte", formatCAD(sku.adult_base_cost), "Coût enfant", formatCAD(sku.kid_base_cost)],
      ["Détail adulte", formatCAD(sku.adult_retail), "Détail enfant", formatCAD(sku.kid_retail)],
      ["Bundle", formatCAD(sku.bundle_price), "Bundle + Perso", formatCAD(sku.bundle_with_perso)],
    ];

    for (const row of priceData) {
      doc.setFillColor(...C.light);
      doc.roundedRect(MARGIN, y - 3, colW - 1, 9, 1, 1, "F");
      doc.roundedRect(MARGIN + colW, y - 3, colW - 1, 9, 1, 1, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.mid);
      doc.text(row[0], MARGIN + 2, y + 1);
      doc.text(row[2], MARGIN + colW + 2, y + 1);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.dark);
      doc.text(row[1], MARGIN + colW - 4, y + 1, { align: "right" });
      doc.text(row[3], MARGIN + colW * 2 - 4, y + 1, { align: "right" });

      y += 11;
    }

    // Margin + Products
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(`Marge : ${sku.margin_pct}%  ·  Produits : ${sku.products?.join(", ") || "—"}`, MARGIN, y);
    y += 8;

    // ── Storytelling ──────────────────────────────
    if (sku.story) {
      y = checkPage(doc, y, 20);
      y = drawDivider(doc, y);
      drawLabel(doc, "MYTHOLOGIE", MARGIN, y);
      y += 4;
      y = drawBody(doc, sku.story.mythology, MARGIN, y, CONTENT_W);
      y += 4;

      // Punchlines
      if (sku.story.punchlines?.length) {
        y = checkPage(doc, y, 15);
        drawLabel(doc, "PUNCHLINES", MARGIN, y);
        y += 4;
        for (const p of sku.story.punchlines) {
          y = checkPage(doc, y, 6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.dark);
          doc.text(`• ${p}`, MARGIN + 2, y);
          y += 4;
        }
        y += 2;
      }

      // Shopify
      y = checkPage(doc, y, 15);
      drawLabel(doc, "DESCRIPTION SHOPIFY", MARGIN, y);
      y += 4;
      y = drawBody(doc, sku.story.shopify_description, MARGIN, y, CONTENT_W);
      y += 4;

      // Social captions side by side
      y = checkPage(doc, y, 25);
      const halfW = CONTENT_W / 2 - 2;
      drawLabel(doc, "TIKTOK", MARGIN, y);
      drawLabel(doc, "INSTAGRAM", MARGIN + halfW + 4, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.dark);

      const tikLines = doc.splitTextToSize(sku.story.tiktok_caption || "", halfW);
      const igLines = doc.splitTextToSize(sku.story.instagram_caption || "", halfW);
      doc.text(tikLines, MARGIN, y);
      doc.text(igLines, MARGIN + halfW + 4, y);

      y += Math.max(tikLines.length, igLines.length) * 3.5 + 4;

      // Mockup brief
      y = checkPage(doc, y, 15);
      drawLabel(doc, "MOCK-UP BRIEF", MARGIN, y);
      y += 4;
      doc.setFillColor(240, 240, 238);
      const briefLines = doc.splitTextToSize(sku.mockup_brief, CONTENT_W - 8);
      const briefH = briefLines.length * 3.5 + 4;
      doc.roundedRect(MARGIN, y - 3, CONTENT_W, briefH + 2, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.text(briefLines, MARGIN + 4, y);
    }
  }

  // ── Footer on each page ──────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.mid);
    doc.text(`${collection.name} — DADZCO Brand OS`, MARGIN, PAGE_H - 8);
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  // Save
  const safeName = collection.name.replace(/[^a-zA-Z0-9àâéèêëïîôùûüç\s-]/g, "").replace(/\s+/g, "-");
  doc.save(`${safeName}-collection.pdf`);
}
