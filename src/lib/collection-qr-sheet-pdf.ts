import jsPDF from "jspdf";

export interface QRSheetSKU {
  sku: string | null;
  title: string | null;
  provider: string | null;
}

export interface QRSheetInput {
  collectionName: string;
  lifecycleLabel: string | null;
  targetUrl: string;
  shortCode: string | null;
  skus: QRSheetSKU[];
  qrImageDataUrl: string;
}

const C = {
  dark: [30, 41, 59] as [number, number, number],
  mid: [100, 116, 139] as [number, number, number],
  light: [226, 232, 240] as [number, number, number],
  accent: [42, 55, 71] as [number, number, number],
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

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9àâéèêëïîôùûüç\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "qr-sheet"
  );
}

export function exportCollectionQRSheetPDF(input: QRSheetInput): void {
  const { collectionName, lifecycleLabel, targetUrl, shortCode, skus, qrImageDataUrl } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header band
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.mid);
  doc.text("DADZCO | MUMZCO | APPAREL", MARGIN, MARGIN);
  doc.text("COLLECTION QR SHEET", PAGE_W - MARGIN, MARGIN, { align: "right" });

  let y = MARGIN + 8;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.accent);
  const nameLines = doc.splitTextToSize(collectionName, CONTENT_W);
  doc.text(nameLines, MARGIN, y);
  y += nameLines.length * 8;

  if (lifecycleLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.dark);
    doc.text(lifecycleLabel, MARGIN, y);
    y += 6;
  }

  y = drawDivider(doc, y);

  // QR — centered, large
  const qrSize = 80;
  const qrX = (PAGE_W - qrSize) / 2;
  try {
    doc.addImage(qrImageDataUrl, "PNG", qrX, y, qrSize, qrSize);
  } catch {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.mid);
    doc.text("QR image unavailable", PAGE_W / 2, y + 40, { align: "center" });
  }
  y += qrSize + 6;

  // URL
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const urlLines = doc.splitTextToSize(targetUrl, CONTENT_W);
  doc.text(urlLines, PAGE_W / 2, y, { align: "center" });
  y += urlLines.length * 4 + 2;

  // Short code
  if (shortCode) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.accent);
    doc.text(shortCode, PAGE_W / 2, y, { align: "center" });
    y += 6;
  }

  y += 2;
  y = drawDivider(doc, y);

  // SKU roster
  y = checkPage(doc, y, 14);
  drawLabel(doc, `SKUs in this collection (${skus.length})`, MARGIN, y);
  y += 6;

  if (skus.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.mid);
    doc.text("No SKUs recorded in this collection.", MARGIN, y);
    y += 6;
  } else {
    const col = {
      sku: MARGIN,
      title: MARGIN + 55,
      provider: MARGIN + 150,
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.mid);
    doc.text("SKU", col.sku, y);
    doc.text("DESIGN", col.title, y);
    doc.text("PROVIDER", col.provider, y);
    y += 2;
    y = drawDivider(doc, y);

    for (const item of skus) {
      y = checkPage(doc, y, 8);

      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.dark);
      doc.text(item.sku ?? "—", col.sku, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.dark);
      const titleLines = doc.splitTextToSize(item.title ?? "—", 90);
      doc.text(titleLines, col.title, y);

      doc.setTextColor(...C.mid);
      doc.text(item.provider ?? "—", col.provider, y);

      y += Math.max(5, titleLines.length * 4);
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
      `${collectionName} — DADZCO Collection QR Sheet`,
      MARGIN,
      PAGE_H - 8,
    );
    doc.text(`${i} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const filename = `${sanitizeFilename(collectionName)}-qr-sheet.pdf`;
  doc.save(filename);
}
