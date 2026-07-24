"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  PC_BUILDER_SLOTS,
  type PCBuilderSlotId,
} from "@/lib/rubros/modules/tecnologia/pc-builder";
import { cn } from "@/lib/cn";

interface PCBuilderSlotFieldProps {
  value: PCBuilderSlotId | "";
  onChange: (value: PCBuilderSlotId | "") => void;
  disabled?: boolean;
  variant?: "default" | "compact";
  id?: string;
  name?: string;
}

export function PCBuilderSlotField({
  value,
  onChange,
  disabled = false,
  variant = "default",
  id = "pc-builder-slot",
  name = "pc_builder_slot",
}: PCBuilderSlotFieldProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-sky-200/70 bg-sky-50/35 p-4 dark:border-sky-900/40 dark:bg-sky-950/20",
        isCompact && "p-3.5",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Componente PC Builder
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Clasifica este producto para &quot;Arma tu PC&quot;. Si lo dejas en
          automático, se usará la categoría del producto.
        </p>
      </div>

      <div>
        <Label
          htmlFor={id}
          className={isCompact ? "payment-field-label" : "label-field"}
        >
          Slot del armado
        </Label>
        <Select
          id={id}
          name={name}
          value={value}
          onChange={(e) =>
            onChange(e.target.value as PCBuilderSlotId | "")
          }
          disabled={disabled}
          className={cn("mt-1.5", isCompact && "payment-field-input")}
        >
          <option value="">Automático por categoría</option>
          {PC_BUILDER_SLOTS.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
