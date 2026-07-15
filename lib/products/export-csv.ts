import type { CatalogListItem } from "@/lib/database.types";
import { PRODUCT_IMPORT_COLUMNS } from "@/lib/products/import-schema";
import { mapCatalogItemToExportRow } from "@/lib/products/export-xlsx";

const CSV_UTF8_BOM = "\uFEFF";
const CSV_LINE_BREAK = "\r\n";

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildProductExportCsvRows(products: CatalogListItem[]): string[][] {
  const headerRow = [...PRODUCT_IMPORT_COLUMNS];
  const dataRows = products.map((product) => {
    const row = mapCatalogItemToExportRow(product);
    return [
      row.nombre,
      row.descripcion,
      String(row.precio),
      String(row.stock),
      row.url_imagen,
      row.categoria,
    ];
  });

  return [headerRow, ...dataRows];
}

export function buildCatalogCsvFileName(storeSlug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeSlug =
    storeSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "tienda";
  return `catalogo_${safeSlug}_${date}.csv`;
}

export function encodeProductsCsv(products: CatalogListItem[]): Buffer {
  const rows = buildProductExportCsvRows(products);
  const csvText =
    CSV_UTF8_BOM +
    rows
      .map((row) => row.map(escapeCsvField).join(","))
      .join(CSV_LINE_BREAK);

  return Buffer.from(csvText, "utf8");
}
