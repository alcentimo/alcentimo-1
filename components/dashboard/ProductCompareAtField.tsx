"use client";

import { useMemo } from "react";
import { computeProductDiscountPercent } from "@/lib/catalog/pricing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface ProductCompareAtFieldProps {
  priceUsd: string;
  compareAtUsd: string;
  onCompareAtUsdChange: (value: string) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
  idPrefix?: string;
}

export function ProductCompareAtField({
  priceUsd,
  compareAtUsd,
  onCompareAtUsdChange,
  disabled = false,
  variant = "default",
  idPrefix = "compare-at",
}: ProductCompareAtFieldProps) {
  const discountPercent = useMemo(() => {
    const sale = parseFloat(priceUsd);
    const compare = parseFloat(compareAtUsd);
    return computeProductDiscountPercent(compare, sale);
  }, [priceUsd, compareAtUsd]);

  const inputClass =
    variant === "compact" ? "payment-field-input mt-1.5" : "input-field";
  const labelClass =
    variant === "compact" ? "payment-field-label" : "label-field";

  return (
    <div>
      <Label htmlFor={`${idPrefix}-usd`} className={labelClass}>
        Precio regular ($){" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          (opcional)
        </span>
      </Label>
      <Input
        id={`${idPrefix}-usd`}
        name="compare_at_usd"
        type="number"
        min={0}
        step="0.01"
        placeholder="Precio tachado en catálogo"
        value={compareAtUsd}
        onChange={(e) => onCompareAtUsdChange(e.target.value)}
        disabled={disabled}
        className={cn(inputClass, variant === "default" && "mt-1.5")}
        inputMode="decimal"
      />
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        Si es mayor al precio de venta, el catálogo mostrará la etiqueta{" "}
        <strong>Oferta</strong> con el descuento calculado.
      </p>
      {discountPercent != null && (
        <p className="mt-1 text-xs font-medium text-orange-600 dark:text-orange-400">
          Descuento: −{discountPercent}%
        </p>
      )}
    </div>
  );
}
