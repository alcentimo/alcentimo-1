"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  TECH_SPEC_PRESETS,
  getTechSpecLabels,
} from "@/lib/rubros/modules/tecnologia";
import { cn } from "@/lib/cn";

interface TechSpecsEditorProps {
  categorySlug: string;
  categoryLabel?: string | null;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export function TechSpecsEditor({
  categorySlug,
  categoryLabel = null,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: TechSpecsEditorProps) {
  const labels = useMemo(
    () => getTechSpecLabels(categorySlug),
    [categorySlug],
  );
  const isCompact = variant === "compact";

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
    // Solo alinear keys al cambiar categoría / labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita loop con onChange
  }, [categorySlug, labels.join("|")]);

  function updateField(label: string, value: string) {
    onChange({ ...values, [label]: value });
  }

  const helperText = categoryLabel
    ? `Campos según ${categoryLabel}.`
    : "Elige una categoría para ver las especificaciones adecuadas.";

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-sky-200/70 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20",
        isCompact && "p-3.5",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Especificaciones técnicas
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {helperText}
        </p>
      </div>

      <div className={cn("grid gap-3", !isCompact && "sm:grid-cols-2")}>
        {labels.map((label) => {
          const inputId = `tech-spec-${label.toLowerCase().replace(/\s+/g, "-")}`;
          const presets = TECH_SPEC_PRESETS[label];
          const listId = presets ? `${inputId}-presets` : undefined;

          return (
            <div key={label}>
              <Label
                htmlFor={inputId}
                className={isCompact ? "payment-field-label" : "label-field"}
              >
                {label}
              </Label>
              <Input
                id={inputId}
                list={listId}
                value={values[label] ?? ""}
                onChange={(e) => updateField(label, e.target.value)}
                placeholder={
                  label === "Almacenamiento"
                    ? "Ej. 256 GB"
                    : label === "Memoria RAM"
                      ? "Ej. 8 GB"
                      : label === "Compatibilidad"
                        ? "Ej. USB-C / Android"
                        : `Ej. ${label}`
                }
                maxLength={120}
                disabled={disabled}
                className={cn(
                  "mt-1.5",
                  isCompact ? "payment-field-input" : "input-field",
                )}
              />
              {presets ? (
                <datalist id={listId}>
                  {presets.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
