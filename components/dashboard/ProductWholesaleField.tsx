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
    return `Desde ${minQty} unidades: ${formatUsd(wholesale)}/u (−${pct}% vs detal)`;
  }, [priceUsd, wholesalePriceUsd, wholesaleMinQty]);

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20",
        variant === "compact" && "p-3.5",
      )}
    >
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Venta al mayor
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        Configura un precio especial por volumen. Ambos campos son opcionales,
        pero debes completar los dos para activar el mayorista en este producto.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-price`} className={labelClass}>
            Precio Mayorista ($)
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
          <p className="mt-1.5 text-xs text-zinc-500">
            Debe ser menor al precio de detal.
          </p>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-min-qty`} className={labelClass}>
            Cantidad mínima (MOQ)
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
          <p className="mt-1.5 text-xs text-zinc-500">
            Unidades mínimas para aplicar el precio mayorista (2 o más).
          </p>
        </div>
      </div>

      {savingsHint ? (
        <p className="mt-3 rounded-lg border border-emerald-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {savingsHint}
        </p>
      ) : null}
    </div>
  );
}
