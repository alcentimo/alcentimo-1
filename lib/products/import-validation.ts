import {
  listUnmappedRequiredColumns,
  resolveImportColumnMap,
} from "@/lib/products/import-column-mapping";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_LIMITS,
  PRODUCT_IMPORT_MAX_ROWS,
  type ImportPreviewCellValues,
  type ImportPreviewRow,
  type ProductImportColumn,
  type ProductImportValidationResult,
  type ValidatedImportRow,
} from "@/lib/products/import-schema";
import {
  mapHeaders,
  normalizeImportCategoryName,
  parseImportPrice,
  parseImportStock,
  sanitizeImportImageUrl,
  sanitizeImportText,
} from "@/lib/products/import-sanitize";

function cellValue(row: unknown[], index: number | undefined): unknown {
  if (index === undefined) return "";
  return row[index] ?? "";
}

function previewText(value: unknown, maxLength = 80): string {
  const text = sanitizeImportText(value, maxLength);
  return text || "—";
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((cell) => sanitizeImportText(cell, 5000) === "");
}

function buildPreviewValues(
  row: unknown[],
  columnMap: Partial<Record<ProductImportColumn, number>>,
): ImportPreviewCellValues {
  return {
    nombre: previewText(cellValue(row, columnMap.nombre), 48),
    descripcion: previewText(cellValue(row, columnMap.descripcion), 64),
    precio: previewText(cellValue(row, columnMap.precio), 24),
    stock: previewText(cellValue(row, columnMap.stock), 16),
    categoria: previewText(cellValue(row, columnMap.categoria), 32),
    url_imagen: previewText(cellValue(row, columnMap.url_imagen), 48),
  };
}

function validateDataRow(
  row: unknown[],
  rowNumber: number,
  columnMap: Partial<Record<ProductImportColumn, number>>,
): ImportPreviewRow {
  const rowErrors: string[] = [];

  const nombre = sanitizeImportText(
    cellValue(row, columnMap.nombre),
    PRODUCT_IMPORT_LIMITS.nombre,
  );
  const descripcionRaw = sanitizeImportText(
    cellValue(row, columnMap.descripcion),
    PRODUCT_IMPORT_LIMITS.descripcion,
  );
  const categoriaRaw = sanitizeImportText(
    cellValue(row, columnMap.categoria),
    PRODUCT_IMPORT_LIMITS.categoria,
  );
  const categoria = categoriaRaw
    ? normalizeImportCategoryName(categoriaRaw)
    : "";
  const precio = parseImportPrice(cellValue(row, columnMap.precio));
  const stock = parseImportStock(cellValue(row, columnMap.stock));
  const urlRaw = cellValue(row, columnMap.url_imagen);
  const urlProvided = sanitizeImportText(urlRaw, PRODUCT_IMPORT_LIMITS.url_imagen);
  const url_imagen = urlProvided ? sanitizeImportImageUrl(urlRaw) : null;

  if (!nombre) {
    rowErrors.push("nombre es obligatorio");
  }
  if (!categoria) {
    rowErrors.push("categoria es obligatoria");
  }
  if (precio === null) {
    rowErrors.push("precio debe ser un número válido ≥ 0");
  }
  if (stock === null) {
    rowErrors.push("stock debe ser un número entero ≥ 0");
  }
  if (urlProvided && !url_imagen) {
    rowErrors.push("url_imagen debe ser una URL válida (http o https)");
  }

  const preview = buildPreviewValues(row, columnMap);
  const valid = rowErrors.length === 0;

  if (!valid) {
    return { rowNumber, valid, errors: rowErrors, preview };
  }

  return {
    rowNumber,
    valid: true,
    errors: [],
    preview,
    validated: {
      rowNumber,
      nombre,
      descripcion: descripcionRaw || null,
      precio: precio!,
      stock: stock!,
      url_imagen,
      categoria,
    },
  };
}

export function validateProductImportSheet(
  rows: unknown[][],
  columnMapInput?: Partial<Record<ProductImportColumn, number | null>>,
): ProductImportValidationResult {
  const errors: string[] = [];

  if (!rows.length) {
    return emptyValidationResult(["El archivo está vacío."]);
  }

  const headerRow = rows[0] ?? [];
  const columnMap =
    columnMapInput !== undefined
      ? resolveImportColumnMap(columnMapInput)
      : mapHeaders(headerRow);

  const missingRequired = listUnmappedRequiredColumns(columnMap);
  if (missingRequired.length > 0) {
    return emptyValidationResult([
      `Faltan columnas obligatorias por mapear: ${missingRequired.join(", ")}.`,
    ]);
  }

  const dataRows = rows.slice(1).filter((row) => !isRowEmpty(row));

  if (dataRows.length === 0) {
    return emptyValidationResult(["No hay filas de productos para importar."]);
  }

  if (dataRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return emptyValidationResult([
      `El archivo supera el máximo de ${PRODUCT_IMPORT_MAX_ROWS} productos por importación.`,
    ]);
  }

  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) =>
    validateDataRow(row, index + 2, columnMap),
  );

  const validated = previewRows
    .filter((entry) => entry.valid && entry.validated)
    .map((entry) => entry.validated!);

  const invalidRowCount = previewRows.filter((entry) => !entry.valid).length;

  for (const entry of previewRows) {
    if (!entry.valid) {
      errors.push(`Fila ${entry.rowNumber}: ${entry.errors.join("; ")}`);
    }
  }

  return {
    ok: errors.length === 0,
    rows: validated,
    previewRows,
    errors,
    totalDataRows: dataRows.length,
    validRowCount: validated.length,
    invalidRowCount,
  };
}

function emptyValidationResult(errors: string[]): ProductImportValidationResult {
  return {
    ok: false,
    rows: [],
    previewRows: [],
    errors,
    totalDataRows: 0,
    validRowCount: 0,
    invalidRowCount: 0,
  };
}

function detectWorkbookType(fileName: string): "csv" | "xlsx" {
  return fileName.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
}

/** Lee un ArrayBuffer de .xlsx o .csv y devuelve filas crudas (solo primera hoja). */
export async function parseSpreadsheetToRows(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<unknown[][]> {
  const XLSX = await import("xlsx");
  const bookType = detectWorkbookType(fileName);

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    sheetStubs: true,
    bookVBA: false,
    bookDeps: false,
    dense: true,
    ...(bookType === "csv" ? { raw: false } : {}),
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];
}

/** @deprecated Usar parseSpreadsheetToRows */
export async function parseXlsxToRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  return parseSpreadsheetToRows(buffer, "import.xlsx");
}

export async function parseProductImportFile(
  file: File,
): Promise<{ rows: unknown[][]; headers: string[] }> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
    throw new Error("El archivo debe ser .xlsx o .csv.");
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseSpreadsheetToRows(buffer, file.name);
  const headers = (rows[0] ?? []).map((cell, index) => {
    const label = String(cell ?? "").trim();
    return label || `Columna ${index + 1}`;
  });

  return { rows, headers };
}

export async function validateProductImportFile(
  file: File,
  columnMap?: Partial<Record<ProductImportColumn, number | null>>,
): Promise<ProductImportValidationResult> {
  try {
    const { rows } = await parseProductImportFile(file);
    return validateProductImportSheet(rows, columnMap);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo leer el archivo.";
    return emptyValidationResult([message]);
  }
}

export function getMissingColumns(
  headerRow: unknown[],
): ProductImportColumn[] {
  const columnMap = mapHeaders(headerRow);
  return PRODUCT_IMPORT_COLUMNS.filter(
    (column) => columnMap[column] === undefined,
  );
}
