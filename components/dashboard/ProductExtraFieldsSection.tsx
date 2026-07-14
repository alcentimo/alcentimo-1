"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { cn } from "@/lib/cn";

interface ProductExtraFieldsSectionProps {
  fieldLabels: string[];
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  categoryLabel?: string | null;
  disabled?: boolean;
  variant?: "default" | "compact";
}

export function ProductExtraFieldsSection({
  fieldLabels,
  values,
  onChange,
  categoryLabel = null,
  disabled = false,
  variant = "default",
}: ProductExtraFieldsSectionProps) {
  if (fieldLabels.length === 0) return null;

  function updateField(label: string, value: string) {
    onChange({ ...values, [label]: value });
  }

  const isCompact = variant === "compact";

  return (
    <section
      className={cn(
        "rounded-xl border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40",
        isCompact ? "space-y-3 p-3.5" : "space-y-4 p-4 sm:p-5",
      )}
    >
      <div>
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400",
            isCompact ? "text-[11px]" : "text-xs",
          )}
        >
          Detalles del producto
        </p>
        <p className={cn("text-zinc-500 dark:text-zinc-400", isCompact ? "mt-1 text-xs" : "mt-1.5 text-sm")}>
          Campos adaptados a la categoría
          {categoryLabel ? ` · ${categoryLabel}` : ""}.
        </p>
      </div>

      <div className={cn("grid gap-3", !isCompact && "sm:grid-cols-2")}>
        {fieldLabels.map((label) => {
          const inputId = `extra-field-${label.toLowerCase().replace(/\s+/g, "-")}`;
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
                name={`extra_field_${label}`}
                value={values[label] ?? ""}
                onChange={(event) => updateField(label, event.target.value)}
                placeholder={`Ej. ${label}`}
                maxLength={120}
                disabled={disabled}
                className={cn(
                  "mt-1.5",
                  isCompact ? "payment-field-input" : "input-field",
                )}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
