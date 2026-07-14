import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_LIMITS,
  PRODUCT_IMPORT_MAX_ROWS,
  type ProductImportColumn,
  type ProductImportValidationResult,
  type ValidatedImportRow,
} from "@/lib/products/import-schema";
import {
  mapHeaders,
  parseImportPrice,
  parseImportStock,
  sanitizeImportImageUrl,
  sanitizeImportText,
} from "@/lib/products/import-sanitize";

function cellValue(row: unknown[], index: number | undefined): unknown {
  if (index === undefined) return "";
  return row[index] ?? "";
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every(
    (cell) => sanitizeImportText(cell, 5000) === "",
  );
}

export function validateProductImportSheet(
  rows: unknown[][],
): ProductImportValidationResult {
  const errors: string[] = [];

  if (!rows.length) {
    return { ok: false, rows: [], errors: ["El archivo está vacío."] };
  }

  const headerRow = rows[0] ?? [];
  const columnMap = mapHeaders(headerRow);

  for (const column of PRODUCT_IMPORT_COLUMNS) {
    if (columnMap[column] === undefined) {
      errors.push(`Falta la columna ${column}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, rows: [], errors };
  }

  const dataRows = rows.slice(1).filter((row) => !isRowEmpty(row));

  if (dataRows.length === 0) {
    return {
      ok: false,
      rows: [],
      errors: ["No hay filas de productos para importar."],
    };
  }

  if (dataRows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      rows: [],
      errors: [
        `El archivo supera el máximo de ${PRODUCT_IMPORT_MAX_ROWS} productos por importación.`,
      ],
    };
  }

  const validated: ValidatedImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? [];
    const rowNumber = i + 2;
    const rowErrors: string[] = [];

    const nombre = sanitizeImportText(
      cellValue(row, columnMap.nombre),
      PRODUCT_IMPORT_LIMITS.nombre,
    );
    const descripcionRaw = sanitizeImportText(
      cellValue(row, columnMap.descripcion),
      PRODUCT_IMPORT_LIMITS.descripcion,
    );
    const categoria = sanitizeImportText(
      cellValue(row, columnMap.categoria),
      PRODUCT_IMPORT_LIMITS.categoria,
    );
    const precio = parseImportPrice(cellValue(row, columnMap.precio));
    const stock = parseImportStock(cellValue(row, columnMap.stock));
    const urlRaw = cellValue(row, columnMap.url_imagen);
    const urlProvided = sanitizeImportText(urlRaw, PRODUCT_IMPORT_LIMITS.url_imagen);
    const url_imagen = urlProvided
      ? sanitizeImportImageUrl(urlRaw)
      : null;

    if (!nombre) {
      rowErrors.push("nombre es obligatorio");
    }
    if (!categoria) {
      rowErrors.push("categoria es obligatoria");
    }
    if (precio === null) {
      rowErrors.push("precio debe ser un número válido mayor o igual a 0");
    }
    if (stock === null) {
      rowErrors.push("stock debe ser un número entero mayor o igual a 0");
    }
    if (urlProvided && !url_imagen) {
      rowErrors.push("url_imagen debe ser una URL válida (http o https)");
    }

    if (rowErrors.length > 0) {
      errors.push(`Fila ${rowNumber}: ${rowErrors.join("; ")}`);
      continue;
    }

    validated.push({
      rowNumber,
      nombre,
      descripcion: descripcionRaw || null,
      precio: precio!,
      stock: stock!,
      url_imagen,
      categoria,
    });
  }

  if (errors.length > 0) {
    return { ok: false, rows: validated, errors };
  }

  return { ok: true, rows: validated, errors: [] };
}

/** Lee un ArrayBuffer de .xlsx y devuelve filas crudas (solo primera hoja). */
export async function parseXlsxToRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const XLSX = await import("xlsx");

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

export async function validateProductImportFile(
  file: File,
): Promise<ProductImportValidationResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ok: false,
      rows: [],
      errors: ["El archivo debe tener extensión .xlsx."],
    };
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseXlsxToRows(buffer);
  return validateProductImportSheet(rows);
}

export function getMissingColumns(
  headerRow: unknown[],
): ProductImportColumn[] {
  const columnMap = mapHeaders(headerRow);
  return PRODUCT_IMPORT_COLUMNS.filter(
    (column) => columnMap[column] === undefined,
  );
}
