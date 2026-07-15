import type { CatalogListItem } from "@/lib/database.types";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_LIMITS,
} from "@/lib/products/import-schema";
import { sanitizeImportText } from "@/lib/products/import-sanitize";

export const PRODUCT_EXPORT_SHEET_NAME = "Productos";

export interface ProductExportRow {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  url_imagen: string;
  categoria: string;
}

export function mapCatalogItemToExportRow(
  product: CatalogListItem,
): ProductExportRow {
  return {
    nombre: sanitizeImportText(
      product.product_name,
      PRODUCT_IMPORT_LIMITS.nombre,
    ),
    descripcion: sanitizeImportText(
      product.short_description ?? "",
      PRODUCT_IMPORT_LIMITS.descripcion,
    ),
    precio:
      product.price_usd != null && Number.isFinite(product.price_usd)
        ? product.price_usd
        : 0,
    stock: Math.max(0, Math.floor(product.available_stock ?? 0)),
    url_imagen: sanitizeImportText(
      product.thumb_url ?? "",
      PRODUCT_IMPORT_LIMITS.url_imagen,
    ),
    categoria: sanitizeImportText(
      product.category_slug || product.category_name || "",
      PRODUCT_IMPORT_LIMITS.categoria,
    ),
  };
}

export function buildProductExportSheetRows(
  products: CatalogListItem[],
): unknown[][] {
  const headerRow = [...PRODUCT_IMPORT_COLUMNS];
  const dataRows = products.map((product) => {
    const row = mapCatalogItemToExportRow(product);
    return [
      row.nombre,
      row.descripcion,
      row.precio,
      row.stock,
      row.url_imagen,
      row.categoria,
    ];
  });

  return [headerRow, ...dataRows];
}

export function buildProductExportFileName(storeSlug: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeSlug = storeSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "tienda";
  return `catalogo_${safeSlug}_${date}.xlsx`;
}

export async function encodeProductsWorkbook(
  products: CatalogListItem[],
): Promise<Buffer> {
  const XLSX = await import("xlsx");
  const rows = buildProductExportSheetRows(products);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 36 },
    { wch: 10 },
    { wch: 8 },
    { wch: 42 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, PRODUCT_EXPORT_SHEET_NAME);

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer;
}
