import jsPDF from "jspdf";
import type { Tables } from "@/integrations/supabase/types";

type ExportPackItem = Pick<
  Tables<"export_pack_items">,
  "id" | "sku_name" | "product_type" | "retail_price_cad" | "cost_cad" | "margin" | "mockup_url"
>;

export type ExportPackPDFInput = Tables<"export_packs"> & {
  collections: Pick<Tables<"collections">, "name" | "lifecycle_status"> | null;
  export_pack_items: ExportPackItem[];
};

const LIFECYCLE_LABELS: Record<string, string> = {
  idea: "Idea",
  strategy_review: "Strategy Review",
  mockup_stage: "Mockup Stage",
  approved_for_production: "Approved",
  in_production: "In Production",
  ready_for_export: "Ready for Export",
  exported: "Exported",
};

const C = {
  dark: [30, 41, 59] as [number, number, number],
  mid: [100, 116, 139] as [number, number, number],
  light: [226, 232, 240] as [number, number, number],
  bg: [248, 246, 243] as [number, number, number],
  accent: [42, 55, 71] as [number, number, number],
  ok: [22, 163, 74] as [number, number, number],
  warn: [220, 38, 38] as [number, number, number],
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
  if (y + needed > PAGE_H - MARGIN - 12) return addPage(doc);
  return y;
}

function drawLabel(doc: jsPDF, label: string, x: number, y: number): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.mid);
  doc.text(label.toUpperCase(), x, y);
}

function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.light);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function formatCAD(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

function formatMargin(value: number | null): { text: string; ok: boolean | null } {
  if (value === null || value === undefined) return { text: "—", ok: null };
  const pct = Math.round(value * 100);
  return { text: `${pct}%`, ok: pct >= 55 };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9àâéèêëïîôùûüç\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "export-pack";
}

export function exportPackPDF(pack: ExportPackPDFInput): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const collectionName = pack.collections?.name ?? "Unknown collection";
  const lifecycleStatus = pack.collections?.lifecycle_status ?? null;
  const lifecycleLabel = lifecycleStatus ? LIFECYCLE_LABELS[lifecycleStatus] ?? lifecycleStatus : null;
  const createdDate = new Date(pack.created_at).toLocaleDateString("fr-CA");
  const itemCount = pack.export_pack_items.length;

  // Header band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.mid);
  doc.text("DADZCO | MUMZCO | APPAREL", MARGIN, MARGIN);
  doc.text("EXPORT PACK", PAGE_W - MARGIN, MARGIN, { align: "right" });

  let y = MARGIN + 8;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.accent);
  doc.text(collectionName, MARGIN, y);
  y += 7;

  // Sub-header: version · status · lifecycle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  const subParts = [`v${pack.version}`, pack.status];
  if (lifecycleLabel) subParts.push(lifecycleLabel);
  doc.text(subParts.join("  ·  "), MARGIN, y);
  y += 8;

  y = drawDivider(doc, y);

  // Metadata rows
  const metaRows: Array<[string, string]> = [
    ["Pack ID", pack.id],
    ["Collection", collectionName],
    ["SKUs", `${itemCount}`],
    ["Created", createdDate],
  ];
  if (pack.folder_path) metaRows.push(["Folder path", pack.folder_path]);

  for (const [label, value] of metaRows) {
    y = checkPage(doc, y, 6);
    drawLabel(doc, label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.dark);
    const lines = doc.splitTextToSize(value, CONTENT_W - 40);
    doc.text(lines, MARGIN + 40, y);
    y += Math.max(5, lines.length * 4);
  }

  y += 2;
  y = drawDivider(doc, y);

  // Folder structure (optional, from manifest)
  const manifest = pack.manifest as Record<string, unknown> | null;
  const folderStructure =
    manifest && typeof manifest === "object" && !Array.isArray(manifest)
      ? (manifest.folderStructure as Record<string, string> | undefined)
      : undefined;

  if (folderStructure && Object.keys(folderStructure).length > 0) {
    y = checkPage(doc, y, 12);
    drawLabel(doc, "Folder structure", MARGIN, y);
    y += 5;

    for (const [key, path] of Object.entries(folderStructure)) {
      y = checkPage(doc, y, 5);
      const keyLabel = key.replace(/([A-Z])/g, " $1").toLowerCase();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.mid);
      doc.text(keyLabel, MARGIN, y);
      doc.setFont("courier", "normal");
      doc.setTextColor(...C.dark);
      const pathLines = doc.splitTextToSize(String(path), CONTENT_W - 40);
      doc.text(pathLines, MARGIN + 40, y);
      y += Math.max(4, pathLines.length * 3.5);
    }

    y += 2;
    y = drawDivider(doc, y);
  }

  // SKU table
  y = checkPage(doc, y, 14);
  drawLabel(doc, `SKUs in this pack (${itemCount})`, MARGIN, y);
  y += 6;

  if (itemCount === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.mid);
    doc.text("No items recorded in this pack.", MARGIN, y);
    y += 6;
  } else {
    // Column layout (mm)
    const col = {
      sku: MARGIN,
      type: MARGIN + 70,
      cost: MARGIN + 105,
      retail: MARGIN + 135,
      margin: MARGIN + 165,
    };

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.mid);
    doc.text("SKU", col.sku, y);
    doc.text("TYPE", col.type, y);
    doc.text("COST", col.cost, y, { align: "right" });
    doc.text("RETAIL", col.retail, y, { align: "right" });
    doc.text("MARGIN", col.margin, y, { align: "right" });
    y += 2;
    y = drawDivider(doc, y);

    for (const item of pack.export_pack_items) {
      y = checkPage(doc, y, 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.dark);

      const skuLines = doc.splitTextToSize(item.sku_name ?? "—", 65);
      doc.text(skuLines, col.sku, y);

      doc.setTextColor(...C.mid);
      doc.text(item.product_type ?? "—", col.type, y);

      doc.setFont("courier", "normal");
      doc.setTextColor(...C.dark);
      doc.text(formatCAD(item.cost_cad), col.cost, y, { align: "right" });
      doc.text(formatCAD(item.retail_price_cad), col.retail, y, { align: "right" });

      const m = formatMargin(item.margin);
      if (m.ok === true) doc.setTextColor(...C.ok);
      else if (m.ok === false) doc.setTextColor(...C.warn);
      else doc.setTextColor(...C.mid);
      doc.setFont("helvetica", "bold");
      doc.text(m.text, col.margin, y, { align: "right" });

      y += Math.max(5, skuLines.length * 4);

      doc.setDrawColor(...C.light);
      doc.setLineWidth(0.15);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 2;
    }
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.mid);
    doc.text(
      `${collectionName} — DADZCO Export Pack v${pack.version}`,
      MARGIN,
      PAGE_H - 8,
    );
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, {
      align: "right",
    });
  }

  const filename = `${sanitizeFilename(collectionName)}-export-pack-v${pack.version}.pdf`;
  doc.save(filename);
}
