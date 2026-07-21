"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import {
  COLLECTIBLE_CONDITION_OPTIONS,
  COLLECTIBLE_EDITION_OPTIONS,
  COLLECTIBLE_FIELD_CONDITION,
  COLLECTIBLE_FIELD_EDITION,
  COLLECTIBLE_FIELD_ETA,
  COLLECTIBLE_FIELD_PREORDER,
  COLLECTIBLE_PREORDER_NO,
  COLLECTIBLE_PREORDER_YES,
  getCollectibleFieldLabels,
  isCollectiblePreorder,
} from "@/lib/rubros/modules/coleccionables";
import { cn } from "@/lib/cn";

interface CollectibleAttributesEditorProps {
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export function CollectibleAttributesEditor({
  values,
  onChange,
  disabled = false,
  variant = "default",
}: CollectibleAttributesEditorProps) {
  const isCompact = variant === "compact";
  const labels = getCollectibleFieldLabels();
  const preorderOn = isCollectiblePreorder(values[COLLECTIBLE_FIELD_PREORDER]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alinear keys una vez
  }, [labels.join("|")]);

  function updateField(label: string, value: string) {
    const next = { ...values, [label]: value };
    if (
      label === COLLECTIBLE_FIELD_PREORDER &&
      !isCollectiblePreorder(value)
    ) {
      next[COLLECTIBLE_FIELD_ETA] = "";
    }
    onChange(next);
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-amber-200/70 bg-amber-50/35 p-4 dark:border-amber-900/40 dark:bg-amber-950/20",
        isCompact && "p-3.5",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Atributos de coleccionable
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Condición, rareza y opciones de preventa para cómics, figuras y merch.
        </p>
      </div>

      <div className={cn("grid gap-3", !isCompact && "sm:grid-cols-2")}>
        <div>
          <Label
            htmlFor="collectible-condition"
            className={isCompact ? "payment-field-label" : "label-field"}
          >
            Condición / Estado
          </Label>
          <Select
            id="collectible-condition"
            value={values[COLLECTIBLE_FIELD_CONDITION] ?? ""}
            onChange={(e) =>
              updateField(COLLECTIBLE_FIELD_CONDITION, e.target.value)
            }
            disabled={disabled}
            className={cn("mt-1.5", isCompact && "payment-field-input")}
          >
            <option value="">Seleccionar…</option>
            {COLLECTIBLE_CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label
            htmlFor="collectible-edition"
            className={isCompact ? "payment-field-label" : "label-field"}
          >
            Edición / Rareza
          </Label>
          <Select
            id="collectible-edition"
            value={values[COLLECTIBLE_FIELD_EDITION] ?? ""}
            onChange={(e) =>
              updateField(COLLECTIBLE_FIELD_EDITION, e.target.value)
            }
            disabled={disabled}
            className={cn("mt-1.5", isCompact && "payment-field-input")}
          >
            <option value="">Seleccionar…</option>
            {COLLECTIBLE_EDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className={!isCompact ? "sm:col-span-2" : undefined}>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={preorderOn}
              onChange={(e) =>
                updateField(
                  COLLECTIBLE_FIELD_PREORDER,
                  e.target.checked
                    ? COLLECTIBLE_PREORDER_YES
                    : COLLECTIBLE_PREORDER_NO,
                )
              }
              disabled={disabled}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Producto en preventa (Pre-order)
          </label>
        </div>

        {preorderOn ? (
          <div className={!isCompact ? "sm:col-span-2" : undefined}>
            <Label
              htmlFor="collectible-eta"
              className={isCompact ? "payment-field-label" : "label-field"}
            >
              Fecha estimada de llegada
            </Label>
            <Input
              id="collectible-eta"
              type="date"
              value={values[COLLECTIBLE_FIELD_ETA] ?? ""}
              onChange={(e) =>
                updateField(COLLECTIBLE_FIELD_ETA, e.target.value)
              }
              disabled={disabled}
              className={cn(
                "mt-1.5",
                isCompact ? "payment-field-input" : "input-field",
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
