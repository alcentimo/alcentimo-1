import {
  PRODUCT_IMPORT_COLUMNS,
  type ProductImportColumn,
} from "@/lib/products/import-schema";
import { normalizeHeaderKey } from "@/lib/products/import-sanitize";

/** Columnas que el usuario debe mapear antes de importar. */
export const REQUIRED_IMPORT_COLUMNS: ProductImportColumn[] = [
  "nombre",
  "precio",
  "stock",
  "categoria",
];

export const OPTIONAL_IMPORT_COLUMNS: ProductImportColumn[] = [
  "descripcion",
  "url_imagen",
];

export const IMPORT_COLUMN_LABELS: Record<ProductImportColumn, string> = {
  nombre: "Nombre del producto",
  descripcion: "Descripción",
  precio: "Precio (USD)",
  stock: "Stock",
  url_imagen: "URL de imagen (opcional)",
  categoria: "Categoría",
};

const HEADER_ALIASES: Record<ProductImportColumn, readonly string[]> = {
  nombre: [
    "nombre",
    "name",
    "producto",
    "product",
    "product_name",
    "titulo",
    "title",
    "item",
    "articulo",
    "artículo",
  ],
  descripcion: [
    "descripcion",
    "descripción",
    "description",
    "desc",
    "detalle",
    "detalles",
    "short_description",
  ],
  precio: [
    "precio",
    "price",
    "precio_usd",
    "amount",
    "amount_usd",
    "costo",
    "cost",
    "valor",
  ],
  stock: [
    "stock",
    "inventario",
    "cantidad",
    "qty",
    "quantity",
    "existencia",
    "unidades",
    "stock_quantity",
  ],
  url_imagen: [
    "url_imagen",
    "imagen",
    "image",
    "image_url",
    "url",
    "foto",
    "photo",
    "picture",
    "img",
  ],
  categoria: [
    "categoria",
    "categoría",
    "category",
    "cat",
    "tipo",
    "rubro",
    "familia",
  ],
};

function headerLabels(headerRow: unknown[]): string[] {
  return headerRow.map((cell, index) => {
    const label = String(cell ?? "").trim();
    return label || `Columna ${index + 1}`;
  });
}

/** Sugiere mapeo automático leyendo cabeceras del archivo del usuario. */
export function suggestImportColumnMapping(
  headerRow: unknown[],
): Partial<Record<ProductImportColumn, number>> {
  const normalized = headerRow.map((cell) => normalizeHeaderKey(cell));
  const map: Partial<Record<ProductImportColumn, number>> = {};
  const usedIndices = new Set<number>();

  for (const column of PRODUCT_IMPORT_COLUMNS) {
    const aliases = HEADER_ALIASES[column];
    const matchIndex = normalized.findIndex(
      (key, index) => !usedIndices.has(index) && aliases.includes(key),
    );

    if (matchIndex >= 0) {
      map[column] = matchIndex;
      usedIndices.add(matchIndex);
    }
  }

  return map;
}

export function getImportHeaderOptions(headerRow: unknown[]): string[] {
  return headerLabels(headerRow);
}

export function listUnmappedRequiredColumns(
  mapping: Partial<Record<ProductImportColumn, number | null | undefined>>,
): ProductImportColumn[] {
  return REQUIRED_IMPORT_COLUMNS.filter(
    (column) => mapping[column] === undefined || mapping[column] === null,
  );
}

export function isImportMappingComplete(
  mapping: Partial<Record<ProductImportColumn, number | null | undefined>>,
): boolean {
  return listUnmappedRequiredColumns(mapping).length === 0;
}

export function resolveImportColumnMap(
  mapping: Partial<Record<ProductImportColumn, number | null | undefined>>,
): Partial<Record<ProductImportColumn, number>> {
  const resolved: Partial<Record<ProductImportColumn, number>> = {};

  for (const column of PRODUCT_IMPORT_COLUMNS) {
    const index = mapping[column];
    if (typeof index === "number" && index >= 0) {
      resolved[column] = index;
    }
  }

  return resolved;
}
