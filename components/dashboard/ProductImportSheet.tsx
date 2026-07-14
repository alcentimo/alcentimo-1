"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  PRODUCT_IMPORT_MAX_FILE_BYTES,
  PRODUCT_IMPORT_TEMPLATE_FILENAME,
  PRODUCT_IMPORT_TEMPLATE_PATH,
  type ValidatedImportRow,
} from "@/lib/products/import-schema";
import { validateProductImportFile } from "@/lib/products/import-validation";

interface ProductImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ProductImportSheet({
  open,
  onOpenChange,
  onImported,
}: ProductImportSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
  } | null>(null);
  const [validating, startValidate] = useTransition();
  const [importing, startImport] = useTransition();

  function resetState() {
    setFileName(null);
    setValidatedRows([]);
    setValidationErrors([]);
    setImportErrors([]);
    setImportSummary(null);
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
    resetState();

    if (!file) return;

    if (file.size > PRODUCT_IMPORT_MAX_FILE_BYTES) {
      setValidationErrors([
        `El archivo supera el tamaño máximo de ${Math.round(PRODUCT_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
      ]);
      return;
    }

    setFileName(file.name);

    startValidate(async () => {
      const result = await validateProductImportFile(file);
      if (!result.ok) {
        setValidationErrors(result.errors);
        setValidatedRows([]);
        return;
      }

      setValidatedRows(result.rows);
      setValidationErrors([]);
    });
  }

  function handleImport() {
    if (validatedRows.length === 0) return;

    startImport(async () => {
      setImportErrors([]);
      setImportSummary(null);

      const result = await importProductsBulk(validatedRows);

      if (result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      if (result.created > 0 || result.updated > 0) {
        setImportSummary({
          created: result.created,
          updated: result.updated,
        });
        onImported();
      }

      if (result.ok) {
        setTimeout(() => handleOpenChange(false), 1200);
      }
    });
  }

  const canImport = validatedRows.length > 0 && validationErrors.length === 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent onClose={() => handleOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>Importar productos</SheetTitle>
          <SheetDescription>
            Sube un archivo Excel (.xlsx) con la plantilla oficial. Los productos
            existentes se actualizan por nombre; los nuevos se crean automáticamente.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Columnas requeridas:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                nombre, descripcion, precio, stock, url_imagen, categoria
              </span>
            </p>
            <a
              href={PRODUCT_IMPORT_TEMPLATE_PATH}
              download={PRODUCT_IMPORT_TEMPLATE_FILENAME}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar plantilla
            </a>
          </div>

          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              id="product-import-file"
              onChange={handleFileChange}
            />
            <label
              htmlFor="product-import-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-brand-500/60 dark:hover:bg-brand-950/20"
            >
              {validating ? (
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
                {fileName ?? "Seleccionar archivo .xlsx"}
              </span>
              <span className="text-xs text-zinc-500">
                Máximo {Math.round(PRODUCT_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB
              </span>
            </label>
          </div>

          {validationErrors.length > 0 && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/30"
              role="alert"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Errores de validación
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-700 dark:text-red-300">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {canImport && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {validatedRows.length} producto
                {validatedRows.length !== 1 ? "s" : ""} listo
                {validatedRows.length !== 1 ? "s" : ""} para importar
              </div>
            </div>
          )}

          {importSummary && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
              Importación completada: {importSummary.created} creado
              {importSummary.created !== 1 ? "s" : ""},{" "}
              {importSummary.updated} actualizado
              {importSummary.updated !== 1 ? "s" : ""}.
            </div>
          )}

          {importErrors.length > 0 && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
              role="alert"
            >
              <div className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                Problemas durante la importación
              </div>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-800 dark:text-amber-300">
                {importErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              className="btn-brand gap-2"
              disabled={!canImport || importing || validating}
              onClick={handleImport}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              Importar productos
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={importing}
            >
              Cancelar
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
