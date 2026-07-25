"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Table2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { importProductsBulk } from "@/lib/products/import-actions";
import {
  IMPORT_COLUMN_LABELS,
  OPTIONAL_IMPORT_COLUMNS,
  REQUIRED_IMPORT_COLUMNS,
  isImportMappingComplete,
  listUnmappedRequiredColumns,
  suggestImportColumnMapping,
} from "@/lib/products/import-column-mapping";
import {
  downloadProductImportTemplateCsv,
  downloadProductImportTemplateXlsx,
  getImportTemplateColumnHelp,
} from "@/lib/products/import-template-download";
import {
  PRODUCT_IMPORT_COLUMNS,
  PRODUCT_IMPORT_MAX_FILE_BYTES,
  PRODUCT_IMPORT_PREVIEW_ROWS,
  type ProductImportColumn,
  type ProductImportValidationResult,
} from "@/lib/products/import-schema";
import {
  parseProductImportFile,
  validateProductImportSheet,
} from "@/lib/products/import-validation";
import { cn } from "@/lib/cn";

interface ProductImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type ImportStep = "upload" | "mapping" | "preview" | "result";

const STEP_LABELS: Record<ImportStep, string> = {
  upload: "Archivo",
  mapping: "Columnas",
  preview: "Vista previa",
  result: "Resultado",
};

export function ProductImportSheet({
  open,
  onOpenChange,
  onImported,
}: ProductImportSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [headerOptions, setHeaderOptions] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<
    Partial<Record<ProductImportColumn, number | null>>
  >({});
  const [validation, setValidation] =
    useState<ProductImportValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    failed: number;
    partialSuccess: boolean;
  } | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [parsing, startParse] = useTransition();
  const [validating, startValidate] = useTransition();
  const [importing, startImport] = useTransition();
  const [downloadingTemplate, startTemplateDownload] = useTransition();

  const templateColumns = useMemo(() => getImportTemplateColumnHelp(), []);
  const missingRequired = useMemo(
    () => listUnmappedRequiredColumns(columnMapping),
    [columnMapping],
  );
  const previewRows = useMemo(
    () => validation?.previewRows.slice(0, PRODUCT_IMPORT_PREVIEW_ROWS) ?? [],
    [validation?.previewRows],
  );

  function resetState() {
    setStep("upload");
    setFileName(null);
    setRawRows([]);
    setHeaderOptions([]);
    setColumnMapping({});
    setValidation(null);
    setParseError(null);
    setImportSummary(null);
    setImportErrors([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetState();
    }
    onOpenChange(next);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > PRODUCT_IMPORT_MAX_FILE_BYTES) {
      setParseError(
        `El archivo supera el tamaño máximo de ${Math.round(PRODUCT_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }

    setParseError(null);
    setValidation(null);
    setImportSummary(null);
    setImportErrors([]);
    setFileName(file.name);

    startParse(async () => {
      try {
        const parsed = await parseProductImportFile(file);
        const suggested = suggestImportColumnMapping(parsed.rows[0] ?? []);

        setRawRows(parsed.rows);
        setHeaderOptions(parsed.headers);
        setColumnMapping(suggested);
        setStep("mapping");
      } catch (error) {
        setParseError(
          error instanceof Error ? error.message : "No se pudo leer el archivo.",
        );
        setStep("upload");
      }
    });
  }

  function updateMapping(column: ProductImportColumn, value: string) {
    setColumnMapping((current) => ({
      ...current,
      [column]: value === "" ? null : Number.parseInt(value, 10),
    }));
    setValidation(null);
  }

  function handleContinueToPreview() {
    if (!isImportMappingComplete(columnMapping)) return;

    startValidate(async () => {
      const result = validateProductImportSheet(rawRows, columnMapping);
      setValidation(result);
      setStep("preview");
    });
  }

  function handleImport() {
    if (!validation?.ok || validation.rows.length === 0) return;

    startImport(async () => {
      setImportErrors([]);
      setImportSummary(null);

      const result = await importProductsBulk(validation.rows);

      setImportSummary({
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        partialSuccess: result.partialSuccess,
      });
      setImportErrors(result.errors);
      setStep("result");

      if (result.created > 0 || result.updated > 0) {
        onImported();
      }
    });
  }

  function handleDownloadTemplate(format: "xlsx" | "csv") {
    startTemplateDownload(async () => {
      if (format === "xlsx") {
        await downloadProductImportTemplateXlsx();
      } else {
        downloadProductImportTemplateCsv();
      }
    });
  }

  const canContinueMapping = isImportMappingComplete(columnMapping);
  const canImport = Boolean(validation?.ok && validation.rows.length > 0);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        onClose={() => handleOpenChange(false)}
        className="max-w-md sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Importar productos</SheetTitle>
          <SheetDescription>
            Flujo guiado: descarga la plantilla, sube tu archivo, verifica el
            mapeo de columnas y confirma la importación.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <ol className="product-import-steps" aria-label="Pasos de importación">
            {(["upload", "mapping", "preview", "result"] as ImportStep[]).map(
              (item, index) => (
                <li
                  key={item}
                  className={cn(
                    "product-import-step",
                    step === item && "product-import-step-active",
                    (["upload", "mapping", "preview", "result"] as ImportStep[]).indexOf(
                      step,
                    ) > index && "product-import-step-done",
                  )}
                >
                  <span className="product-import-step-index">{index + 1}</span>
                  <span>{STEP_LABELS[item]}</span>
                </li>
              ),
            )}
          </ol>

          {step === "upload" ? (
            <>
              <section className="product-import-panel">
                <p className="product-import-panel-title">
                  Paso 1 · Descarga la plantilla
                </p>
                <p className="product-import-panel-copy">
                  Usa estas columnas estándar. Los productos existentes se
                  actualizan por nombre; los nuevos se crean automáticamente.
                </p>
                <ul className="product-import-column-help">
                  {templateColumns.map((entry) => (
                    <li key={entry.column}>
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">
                        {entry.column}
                        {entry.required ? " *" : ""}
                      </span>
                      <span className="text-zinc-500">{entry.description}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={downloadingTemplate}
                    onClick={() => handleDownloadTemplate("xlsx")}
                  >
                    {downloadingTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )}
                    Plantilla Excel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={downloadingTemplate}
                    onClick={() => handleDownloadTemplate("csv")}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Plantilla CSV
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Paso 2 · Sube tu archivo
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  className="sr-only"
                  id="product-import-file"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="product-import-file"
                  className="product-import-dropzone"
                >
                  {parsing ? (
                    <Loader2
                      className="h-8 w-8 animate-spin text-brand-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileSpreadsheet
                      className="h-8 w-8 text-brand-600 dark:text-brand-400"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {fileName ?? "Seleccionar archivo .xlsx o .csv"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Máximo {Math.round(PRODUCT_IMPORT_MAX_FILE_BYTES / (1024 * 1024))}{" "}
                    MB
                  </span>
                </label>
              </section>

              {parseError ? (
                <div className="product-import-alert product-import-alert-error" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>{parseError}</p>
                </div>
              ) : null}
            </>
          ) : null}

          {step === "mapping" ? (
            <>
              <section className="product-import-panel">
                <p className="product-import-panel-title">
                  Mapeo inteligente de columnas
                </p>
                <p className="product-import-panel-copy">
                  Verifica que cada campo de Alcentimo corresponda con una
                  columna de <span className="font-medium">{fileName}</span>.
                </p>
                <div className="mt-4 space-y-3">
                  {PRODUCT_IMPORT_COLUMNS.map((column) => {
                    const required = REQUIRED_IMPORT_COLUMNS.includes(column);
                    const optional = OPTIONAL_IMPORT_COLUMNS.includes(column);

                    return (
                      <div key={column} className="product-import-mapping-row">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {IMPORT_COLUMN_LABELS[column]}
                            {required ? " *" : optional ? " (opcional)" : ""}
                          </p>
                          <p className="text-xs text-zinc-500">Campo: {column}</p>
                        </div>
                        <Select
                          value={
                            columnMapping[column] === undefined ||
                            columnMapping[column] === null
                              ? ""
                              : String(columnMapping[column])
                          }
                          onChange={(event) =>
                            updateMapping(column, event.target.value)
                          }
                          className="product-import-mapping-select"
                          aria-label={`Mapear ${column}`}
                        >
                          <option value="">
                            {required ? "Selecciona columna…" : "No importar"}
                          </option>
                          {headerOptions.map((label, index) => (
                            <option key={`${label}-${index}`} value={String(index)}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </section>

              {missingRequired.length > 0 ? (
                <div className="product-import-alert product-import-alert-warning" role="status">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Faltan columnas obligatorias:{" "}
                    <strong>{missingRequired.join(", ")}</strong>
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setStep("upload")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Cambiar archivo
                </Button>
                <Button
                  type="button"
                  className="btn-brand gap-2"
                  disabled={!canContinueMapping || validating}
                  onClick={handleContinueToPreview}
                >
                  {validating ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  Continuar a vista previa
                </Button>
              </div>
            </>
          ) : null}

          {step === "preview" && validation ? (
            <>
              <section className="product-import-panel">
                <p className="product-import-panel-title">
                  Validación previa al guardado
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="product-import-stat">
                    <span className="product-import-stat-value">
                      {validation.totalDataRows}
                    </span>
                    <span className="product-import-stat-label">Filas</span>
                  </div>
                  <div className="product-import-stat product-import-stat-success">
                    <span className="product-import-stat-value">
                      {validation.validRowCount}
                    </span>
                    <span className="product-import-stat-label">Válidas</span>
                  </div>
                  <div className="product-import-stat product-import-stat-error">
                    <span className="product-import-stat-value">
                      {validation.invalidRowCount}
                    </span>
                    <span className="product-import-stat-label">Con error</span>
                  </div>
                </div>
              </section>

              {validation.errors.length > 0 ? (
                <div className="product-import-alert product-import-alert-error" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">Corrige estos errores antes de importar</p>
                    <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs">
                      {validation.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="product-import-alert product-import-alert-success" role="status">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    {validation.validRowCount} producto
                    {validation.validRowCount !== 1 ? "s" : ""} listo
                    {validation.validRowCount !== 1 ? "s" : ""} para importar.
                  </p>
                </div>
              )}

              <section className="product-import-panel">
                <div className="mb-3 flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                  <p className="product-import-panel-title !mb-0">
                    Vista previa (primeras {previewRows.length} filas)
                  </p>
                </div>
                <div className="product-import-preview-wrap">
                  <table className="product-import-preview-table">
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={cn(!row.valid && "product-import-preview-row-error")}
                        >
                          <td>{row.rowNumber}</td>
                          <td>{row.preview.nombre}</td>
                          <td>{row.preview.precio}</td>
                          <td>{row.preview.stock}</td>
                          <td>{row.preview.categoria}</td>
                          <td>
                            {row.valid ? (
                              <span className="product-import-status-ok">OK</span>
                            ) : (
                              <span className="product-import-status-error" title={row.errors.join("; ")}>
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setStep("mapping")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Ajustar columnas
                </Button>
                <Button
                  type="button"
                  className="btn-brand gap-2"
                  disabled={!canImport || importing}
                  onClick={handleImport}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  Importar {validation.validRowCount} producto
                  {validation.validRowCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </>
          ) : null}

          {step === "result" && importSummary ? (
            <>
              <div
                className={cn(
                  "product-import-alert",
                  importSummary.partialSuccess
                    ? "product-import-alert-warning"
                    : "product-import-alert-success",
                )}
                role="status"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {importSummary.partialSuccess
                      ? "Importación completada con advertencias"
                      : "Importación completada"}
                  </p>
                  <p className="mt-1 text-sm">
                    {importSummary.created} creado
                    {importSummary.created !== 1 ? "s" : ""},{" "}
                    {importSummary.updated} actualizado
                    {importSummary.updated !== 1 ? "s" : ""}
                    {importSummary.failed > 0
                      ? `, ${importSummary.failed} no importado${importSummary.failed !== 1 ? "s" : ""}`
                      : ""}
                    .
                  </p>
                </div>
              </div>

              {importErrors.length > 0 ? (
                <div className="product-import-alert product-import-alert-warning" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">Filas que no se importaron</p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                      {importErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <Button type="button" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
