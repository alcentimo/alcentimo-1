/** Columnas exactas de la plantilla de importación masiva. */
export const PRODUCT_IMPORT_COLUMNS = [
  "nombre",
  "descripcion",
  "precio",
  "stock",
  "url_imagen",
  "categoria",
] as const;

export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];

export const PRODUCT_IMPORT_TEMPLATE_PATH = "/plantilla_alcentimo.xlsx";
export const PRODUCT_IMPORT_TEMPLATE_FILENAME = "plantilla_alcentimo.xlsx";

export const PRODUCT_IMPORT_MAX_ROWS = 500;
export const PRODUCT_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const PRODUCT_IMPORT_LIMITS = {
  nombre: 200,
  descripcion: 5000,
  categoria: 80,
  url_imagen: 2048,
} as const;

export interface ValidatedImportRow {
  rowNumber: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  url_imagen: string | null;
  categoria: string;
}

export interface ProductImportValidationResult {
  ok: boolean;
  rows: ValidatedImportRow[];
  errors: string[];
}

export interface ProductImportResult {
  ok: boolean;
  created: number;
  updated: number;
  errors: string[];
}
