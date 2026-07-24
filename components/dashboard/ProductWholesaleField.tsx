"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/format";

interface ProductWholesaleFieldProps {
  priceUsd: string;
  wholesalePriceUsd: string;
  wholesaleMinQty: string;
  onWholesalePriceUsdChange: (value: string) => void;
  onWholesaleMinQtyChange: (value: string) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
  idPrefix?: string;
}

export function ProductWholesaleField({
  priceUsd,
  wholesalePriceUsd,
  wholesaleMinQty,
  onWholesalePriceUsdChange,
  onWholesaleMinQtyChange,
  disabled = false,
  variant = "default",
  idPrefix = "wholesale",
}: ProductWholesaleFieldProps) {
  const inputClass =
    variant === "compact" ? "payment-field-input mt-1.5" : "input-field";
  const labelClass =
    variant === "compact" ? "payment-field-label" : "label-field";

  const savingsHint = useMemo(() => {
    const retail = parseFloat(priceUsd);
    const wholesale = parseFloat(wholesalePriceUsd);
    const minQty = parseInt(wholesaleMinQty, 10);
    if (
      !Number.isFinite(retail) ||
      !Number.isFinite(wholesale) ||
      !Number.isFinite(minQty) ||
      retail <= 0 ||
      wholesale <= 0 ||
      minQty < 2 ||
      wholesale >= retail
    ) {
      return null;
    }
    const saved = retail - wholesale;
    const pct = Math.round((saved / retail) * 100);
    return `Desde ${minQty} u.: ${formatUsd(wholesale)}/u (−${pct}% vs detal)`;
  }, [priceUsd, wholesalePriceUsd, wholesaleMinQty]);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Precio al mayor
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Opcional. Si el cliente compra la cantidad mínima o más, se aplica
        automáticamente en el catálogo.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-price`} className={labelClass}>
            Precio mayor ($){" "}
            <span className="font-normal text-zinc-500">(opcional)</span>
          </Label>
          <Input
            id={`${idPrefix}-price`}
            name="wholesale_price_usd"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ej: 8.50"
            value={wholesalePriceUsd}
            onChange={(event) => onWholesalePriceUsdChange(event.target.value)}
            disabled={disabled}
            className={cn(inputClass, variant === "default" && "mt-1.5")}
            inputMode="decimal"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-min-qty`} className={labelClass}>
            Cantidad mínima (MOQ){" "}
            <span className="font-normal text-zinc-500">(opcional)</span>
          </Label>
          <Input
            id={`${idPrefix}-min-qty`}
            name="wholesale_min_qty"
            type="number"
            min={2}
            step={1}
            placeholder="Ej: 6"
            value={wholesaleMinQty}
            onChange={(event) => onWholesaleMinQtyChange(event.target.value)}
            disabled={disabled}
            className={cn(inputClass, variant === "default" && "mt-1.5")}
            inputMode="numeric"
          />
        </div>
      </div>

      {savingsHint ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {savingsHint}
        </p>
      ) : null}
    </div>
  );
}
