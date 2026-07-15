import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";

const PDF_BRAND_RGB: [number, number, number] = [15, 118, 110];
const PDF_BRAND_LIGHT_RGB: [number, number, number] = [240, 253, 250];
const PDF_MUTED_RGB: [number, number, number] = [82, 82, 91];
const PDF_TEXT_RGB: [number, number, number] = [24, 24, 27];

const PDF_PAGE_MARGIN_LEFT = 15;
const PDF_PAGE_MARGIN_RIGHT = 15;
const PDF_PAGE_MARGIN_BOTTOM = 20;
const PDF_HEADER_HEIGHT = 36;
const PDF_TABLE_START_Y = 44;

const PDF_IMAGE_COL_WIDTH = 22;
const PDF_PRICE_COL_WIDTH = 28;
const PDF_STOCK_COL_WIDTH = 20;
const PDF_IMAGE_SIZE_MM = 12;
const PDF_IMAGE_PADDING_MM = 1.2;

const PDF_MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const PDF_IMAGE_FETCH_TIMEOUT_MS = 5000;
const PDF_TARGET_THUMB_EDGE = 48;
const PDF_SERVER_JPEG_QUALITY = 58;
const PDF_MAX_EMBEDDED_IMAGE_BYTES = 6 * 1024;

export interface CatalogPdfImageSlot {
  dataUrl: string | null;
  fallbackLabel: string;
}

export function buildCatalogPdfFileName(storeSlug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeSlug =
    storeSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "tienda";
  return `catalogo_${safeSlug}_${date}.pdf`;
}

function formatCatalogGeneratedAt(value: Date): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchCatalogImageDataUrl(
  url: string | null,
): Promise<string | null> {
  if (!url || !isSafeImageUrl(url)) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PDF_IMAGE_FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const contentLength = Number.parseInt(
      response.headers.get("content-length") ?? "0",
      10,
    );
    if (contentLength > PDF_MAX_IMAGE_BYTES) return null;

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    if (sourceBuffer.byteLength > PDF_MAX_IMAGE_BYTES) return null;

    const sharp = (await import("sharp")).default;
    let quality = PDF_SERVER_JPEG_QUALITY;
    let resized = await sharp(sourceBuffer)
      .rotate()
      .resize(PDF_TARGET_THUMB_EDGE, PDF_TARGET_THUMB_EDGE, {
        fit: "cover",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    while (resized.byteLength > PDF_MAX_EMBEDDED_IMAGE_BYTES && quality > 40) {
      quality -= 8;
      resized = await sharp(resized)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    }

    return `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function loadCatalogPdfImages(
  products: CatalogListItem[],
  clientImages?: Record<string, string | null>,
): Promise<CatalogPdfImageSlot[]> {
  return Promise.all(
    products.map(async (product) => {
      const fallbackLabel = product.product_name.charAt(0).toUpperCase() || "?";
      const hasClientEntry =
        clientImages != null && product.product_id in clientImages;

      if (hasClientEntry) {
        return {
          dataUrl: clientImages[product.product_id] ?? null,
          fallbackLabel,
        };
      }

      return {
        dataUrl: await fetchCatalogImageDataUrl(product.thumb_url),
        fallbackLabel,
      };
    }),
  );
}

function drawPdfImagePlaceholder(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
) {
  doc.setFillColor(244, 244, 245);
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");
  doc.setTextColor(113, 113, 122);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(label, x + width / 2, y + height / 2 + 1.2, {
    align: "center",
  });
}

export async function encodeProductsCatalogPdf(
  storeName: string,
  products: CatalogListItem[],
  clientImages?: Record<string, string | null>,
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const generatedAt = new Date();
  const imageSlots = await loadCatalogPdfImages(products, clientImages);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  doc.setProperties({
    title: `Catálogo ${storeName}`,
    subject: "Catálogo de productos",
    author: storeName,
    creator: "Alcentimo",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const printableWidth =
    pageWidth - PDF_PAGE_MARGIN_LEFT - PDF_PAGE_MARGIN_RIGHT;
  const nameColumnWidth =
    printableWidth -
    PDF_IMAGE_COL_WIDTH -
    PDF_PRICE_COL_WIDTH -
    PDF_STOCK_COL_WIDTH;

  doc.setFillColor(...PDF_BRAND_RGB);
  doc.rect(0, 0, pageWidth, PDF_HEADER_HEIGHT, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(storeName, PDF_PAGE_MARGIN_LEFT, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Catálogo de productos para ventas", PDF_PAGE_MARGIN_LEFT, 21);

  doc.setFontSize(8.5);
  doc.text(
    `Generado el ${formatCatalogGeneratedAt(generatedAt)}`,
    PDF_PAGE_MARGIN_LEFT,
    27,
  );

  const tableBody =
    products.length === 0
      ? [["", "Sin productos en el catálogo", "—", "0"]]
      : products.map((product) => [
          "",
          product.product_name,
          formatUsd(product.price_usd),
          String(Math.max(0, Math.floor(product.available_stock ?? 0))),
        ]);

  autoTable(doc, {
    startY: PDF_TABLE_START_Y,
    margin: {
      top: PDF_TABLE_START_Y,
      left: PDF_PAGE_MARGIN_LEFT,
      right: PDF_PAGE_MARGIN_RIGHT,
      bottom: PDF_PAGE_MARGIN_BOTTOM,
    },
    tableWidth: printableWidth,
    head: [["Imagen", "Nombre", "Precio", "Stock"]],
    body: tableBody,
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 },
      lineColor: [228, 228, 231],
      lineWidth: 0.1,
      textColor: PDF_TEXT_RGB,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: PDF_BRAND_RGB,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: { top: 2.6, right: 2.4, bottom: 2.6, left: 2.4 },
    },
    alternateRowStyles: {
      fillColor: PDF_BRAND_LIGHT_RGB,
    },
    columnStyles: {
      0: { cellWidth: PDF_IMAGE_COL_WIDTH, halign: "center" },
      1: { cellWidth: nameColumnWidth },
      2: {
        cellWidth: PDF_PRICE_COL_WIDTH,
        halign: "right",
        fontStyle: "bold",
      },
      3: { cellWidth: PDF_STOCK_COL_WIDTH, halign: "center" },
    },
    bodyStyles: {
      minCellHeight: 16,
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 3) return;
      const stockValue = Number.parseInt(String(data.cell.raw ?? "0"), 10);
      if (stockValue <= 0) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 0) return;
      if (products.length === 0) return;

      const pdf = data.doc;
      const rowIndex = data.row.index;
      const slot = imageSlots[rowIndex];
      if (!slot) return;

      const imageX = data.cell.x + PDF_IMAGE_PADDING_MM;
      const imageY = data.cell.y + PDF_IMAGE_PADDING_MM;
      const imageSize = PDF_IMAGE_SIZE_MM;

      if (slot.dataUrl) {
        pdf.addImage(
          slot.dataUrl,
          "JPEG",
          imageX,
          imageY,
          imageSize,
          imageSize,
          undefined,
          "FAST",
        );
        return;
      }

      drawPdfImagePlaceholder(
        pdf,
        imageX,
        imageY,
        imageSize,
        imageSize,
        slot.fallbackLabel,
      );
    },
    didDrawPage: (data) => {
      const pdf = data.doc;
      const pageNumber = data.pageNumber;
      const totalPages = pdf.getNumberOfPages();

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...PDF_MUTED_RGB);
      pdf.text(
        `${storeName} · Catálogo comercial`,
        PDF_PAGE_MARGIN_LEFT,
        pageHeight - 8,
      );
      pdf.text(
        `Página ${pageNumber} de ${totalPages}`,
        pageWidth - PDF_PAGE_MARGIN_RIGHT,
        pageHeight - 8,
        { align: "right" },
      );
    },
  });

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
