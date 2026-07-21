"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  BEAUTY_FIELD_INGREDIENTS,
  BEAUTY_FIELD_SKIN,
  BEAUTY_SKIN_TYPE_OPTIONS,
  getBeautyFieldLabels,
} from "@/lib/rubros/modules/salud-belleza";
import { cn } from "@/lib/cn";

interface BeautyAttributesEditorProps {
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export function BeautyAttributesEditor({
  values,
  onChange,
  disabled = false,
  variant = "default",
}: BeautyAttributesEditorProps) {
  const isCompact = variant === "compact";
  const labels = getBeautyFieldLabels();

  useEffect(() => {
    const next: ProductExtraFieldsMap = {};
    let changed = false;
    for (const label of labels) {
      next[label] = values[label] ?? "";
      if (!(label in values)) changed = true;
    }
    for (const key of Object.keys(values)) {
      if (!labels.includes(key as (typeof labels)[number])) changed = true;
    }
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alinear keys una vez
  }, [labels.join("|")]);

  function updateField(label: string, value: string) {
    onChange({ ...values, [label]: value });
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-rose-200/70 bg-rose-50/35 p-4 dark:border-rose-900/40 dark:bg-rose-950/20",
        isCompact && "p-3.5",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Atributos de cuidado
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Tipo de piel e ingredientes clave para orientar la recomendación.
        </p>
      </div>

      <div className={cn("grid gap-3", !isCompact && "sm:grid-cols-2")}>
        <div>
          <Label
            htmlFor="beauty-skin"
            className={isCompact ? "payment-field-label" : "label-field"}
          >
            Tipo de piel
          </Label>
          <Select
            id="beauty-skin"
            value={values[BEAUTY_FIELD_SKIN] ?? ""}
            onChange={(e) => updateField(BEAUTY_FIELD_SKIN, e.target.value)}
            disabled={disabled}
            className={cn("mt-1.5", isCompact && "payment-field-input")}
          >
            <option value="">Seleccionar…</option>
            {BEAUTY_SKIN_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className={!isCompact ? "sm:col-span-2" : undefined}>
          <Label
            htmlFor="beauty-ingredients"
            className={isCompact ? "payment-field-label" : "label-field"}
          >
            Ingredientes clave
          </Label>
          <Input
            id="beauty-ingredients"
            value={values[BEAUTY_FIELD_INGREDIENTS] ?? ""}
            onChange={(e) =>
              updateField(BEAUTY_FIELD_INGREDIENTS, e.target.value)
            }
            disabled={disabled}
            placeholder="Ej. Ácido hialurónico, vitamina C, niacinamida"
            className={cn(
              "mt-1.5",
              isCompact ? "payment-field-input" : "input-field",
            )}
          />
        </div>
      </div>
    </div>
  );
}
