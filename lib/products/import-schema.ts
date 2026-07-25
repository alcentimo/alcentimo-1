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
export const PRODUCT_IMPORT_TEMPLATE_CSV_PATH = "/plantilla_alcentimo.csv";
export const PRODUCT_IMPORT_TEMPLATE_CSV_FILENAME = "plantilla_alcentimo.csv";

export const PRODUCT_IMPORT_PREVIEW_ROWS = 8;

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

export interface ImportPreviewCellValues {
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  categoria: string;
  url_imagen: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  valid: boolean;
  errors: string[];
  preview: ImportPreviewCellValues;
  validated?: ValidatedImportRow;
}

export interface ProductImportValidationResult {
  ok: boolean;
  rows: ValidatedImportRow[];
  previewRows: ImportPreviewRow[];
  errors: string[];
  totalDataRows: number;
  validRowCount: number;
  invalidRowCount: number;
}

export interface ProductImportResult {
  ok: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  partialSuccess: boolean;
}
