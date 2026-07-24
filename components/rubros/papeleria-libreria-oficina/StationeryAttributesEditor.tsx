"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  STATIONERY_COLOR_OPTIONS,
  STATIONERY_FIELD_BRAND,
  STATIONERY_FIELD_COLOR,
  STATIONERY_FIELD_FORMAT,
  STATIONERY_FIELD_GRAMMAGE,
  STATIONERY_FIELD_MODEL,
  STATIONERY_FIELD_PRESENTATION,
  STATIONERY_FIELD_SEGMENT,
  STATIONERY_FIELD_SHEET_TYPE,
  STATIONERY_FIELD_UNITS_PER_PACK,
  STATIONERY_FORMAT_OPTIONS,
  STATIONERY_GRAMMAGE_OPTIONS,
  STATIONERY_PRESENTATION_OPTIONS,
  STATIONERY_SEGMENT_OPTIONS,
  STATIONERY_SHEET_TYPE_OPTIONS,
  getStationeryFieldLabelsForEditor,
  getStationeryUnitsPerPackFromFields,
  isStationeryMultiPackPresentation,
} from "@/lib/rubros/modules/papeleria-libreria-oficina";
import { cn } from "@/lib/cn";

interface StationeryAttributesEditorProps {
  categorySlug: string;
  categoryLabel?: string | null;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export function StationeryAttributesEditor({
  categorySlug,
  categoryLabel,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: StationeryAttributesEditorProps) {
  const isCompact = variant === "compact";
  const presentation = values[STATIONERY_FIELD_PRESENTATION] ?? "";
  const unitsPerPack = getStationeryUnitsPerPackFromFields(values);
  const labels = useMemo(
    () => getStationeryFieldLabelsForEditor(categorySlug, presentation),
    [categorySlug, presentation],
  );
  const labelsKey = labels.join("|");

  useEffect(() => {
    const next: ProductExtraFieldsMap = {};
    let changed = false;
    for (const label of labels) {
      next[label] = values[label] ?? "";
      if (!(label in values)) changed = true;
    }
    for (const key of Object.keys(values)) {
      if (!labels.includes(key)) changed = true;
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alinear keys al cambiar categoría/presentación
  }, [labelsKey]);

  function updateField(label: string, value: string) {
    const next = { ...values, [label]: value };
    if (
      label === STATIONERY_FIELD_PRESENTATION &&
      !isStationeryMultiPackPresentation(value)
    ) {
      next[STATIONERY_FIELD_UNITS_PER_PACK] = "";
    }
    onChange(next);
  }

  function renderField(label: string) {
    switch (label) {
      case STATIONERY_FIELD_PRESENTATION:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-presentation"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Presentación
            </Label>
            <Select
              id="stationery-presentation"
              value={values[label] ?? ""}
              onChange={(e) =>
                updateField(label, e.target.value)
              }
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_PRESENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_UNITS_PER_PACK:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-units-per-pack"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Unidades por empaque
              <span className="ml-1 font-normal text-zinc-500">(opcional)</span>
            </Label>
            <Input
              id="stationery-units-per-pack"
              type="number"
              min={2}
              step={1}
              inputMode="numeric"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              placeholder={
                presentation === "Resma"
                  ? "Ej: 500 hojas"
                  : "Ej: 12 unidades"
              }
              className={cn(
                "mt-1.5",
                isCompact ? "payment-field-input" : "input-field",
              )}
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Activa venta por {presentation.toLowerCase()} o por unidad suelta en
              el catálogo.
            </p>
          </div>
        );
      case STATIONERY_FIELD_SEGMENT:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-segment"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Segmento
            </Label>
            <Select
              id="stationery-segment"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_SEGMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_FORMAT:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-format"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Formato / Tamaño
            </Label>
            <Select
              id="stationery-format"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_FORMAT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_COLOR:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-color"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Color
            </Label>
            <Select
              id="stationery-color"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_COLOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_GRAMMAGE:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-grammage"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Gramaje
            </Label>
            <Select
              id="stationery-grammage"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_GRAMMAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_SHEET_TYPE:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-sheet-type"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Tipo de hoja
            </Label>
            <Select
              id="stationery-sheet-type"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              className={cn("mt-1.5", isCompact && "payment-field-input")}
            >
              <option value="">Seleccionar…</option>
              {STATIONERY_SHEET_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        );
      case STATIONERY_FIELD_BRAND:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-brand"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Marca
            </Label>
            <Input
              id="stationery-brand"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              placeholder="Ej: Faber-Castell, Bic, Norma"
              className={cn(
                "mt-1.5",
                isCompact ? "payment-field-input" : "input-field",
              )}
            />
          </div>
        );
      case STATIONERY_FIELD_MODEL:
        return (
          <div key={label}>
            <Label
              htmlFor="stationery-model"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Modelo / Referencia
            </Label>
            <Input
              id="stationery-model"
              value={values[label] ?? ""}
              onChange={(e) => updateField(label, e.target.value)}
              disabled={disabled}
              placeholder="Ej: 0.7 mm, A4 500 hojas"
              className={cn(
                "mt-1.5",
                isCompact ? "payment-field-input" : "input-field",
              )}
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/30",
        isCompact && "p-3.5",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Atributos de papelería
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {categoryLabel
            ? `Campos sugeridos para ${categoryLabel.toLowerCase()}: presentación, marca y formato.`
            : "Presentación, marca, segmento y formato para útiles, oficina y material escolar."}
        </p>
        {unitsPerPack ? (
          <p className="mt-2 rounded-md border border-teal-200/80 bg-teal-50/70 px-2.5 py-1.5 text-[11px] text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
            Venta habilitada por {presentation.toLowerCase()} ({unitsPerPack} u.)
            y por unidad suelta. El stock se registra siempre en unidades base.
          </p>
        ) : null}
      </div>

      <div className={cn("grid gap-3", !isCompact && "sm:grid-cols-2")}>
        {labels.map((label) => renderField(label))}
      </div>
    </div>
  );
}
