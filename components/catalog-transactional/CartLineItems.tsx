"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartItemKey, type CartItem } from "@/lib/catalog/cart-types";
import { formatApproxBs, formatUsd } from "@/lib/format";
import { WholesalePriceBadge } from "@/components/catalog/WholesalePriceBadge";
import { cn } from "@/lib/cn";

interface CartLineItemsProps {
  items: CartItem[];
  onUpdateQuantity: (
    productId: string,
    variantId: string,
    quantity: number,
    modifiers?: CartItem["modifiers"],
  ) => void;
  onRemoveItem: (
    productId: string,
    variantId: string,
    modifiers?: CartItem["modifiers"],
  ) => void;
  /** Lista más compacta (p. ej. paso de pago). */
  compact?: boolean;
  /** Tasa USD→Bs para mostrar equivalente. */
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  className?: string;
}

/** Líneas editables del carrito: cantidad, papelera y total por ítem en vivo. */
export function CartLineItems({
  items,
  onUpdateQuantity,
  onRemoveItem,
  compact = false,
  exchangeRate = null,
  showBsConversion = false,
  className,
}: CartLineItemsProps) {
  const canShowBs =
    showBsConversion && typeof exchangeRate === "number" && exchangeRate > 0;

  return (
    <ul className={cn("txn-checkout-items", compact && "txn-checkout-items--compact", className)}>
      {items.map((item) => {
        const key = cartItemKey(
          item.product.product_id,
          item.variantId,
          item.modifiers,
        );
        const lineTotal = item.unitPriceUsd * item.quantity;
        const lineTotalBs = canShowBs ? lineTotal * exchangeRate : null;

        return (
          <li key={key} className="txn-checkout-item">
            <button
              type="button"
              className="txn-remove-btn"
              onClick={() =>
                onRemoveItem(
                  item.product.product_id,
                  item.variantId,
                  item.modifiers,
                )
              }
              aria-label={`Eliminar ${item.product.product_name} del carrito`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="txn-checkout-item-thumb">
              {item.product.thumb_url ? (
                <Image
                  src={item.product.thumb_url}
                  alt={item.product.product_name}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-400">
                  {item.product.product_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="txn-checkout-item-body">
              <div className="txn-checkout-item-top">
                <div className="min-w-0 pr-1">
                  <p className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {item.product.product_name}
                  </p>
                  {item.variantName !== "Estándar" ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {item.variantName}
                    </p>
                  ) : null}
                  {item.wholesaleApplied ? (
                    <WholesalePriceBadge className="mt-1.5" compact />
                  ) : null}
                </div>
              </div>

              <div className="txn-checkout-item-meta">
                <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                  {formatUsd(lineTotal)}
                </p>
                {lineTotalBs != null ? (
                  <p className="text-xs tabular-nums text-zinc-500">
                    {formatApproxBs(lineTotalBs)}
                  </p>
                ) : !compact ? (
                  <p className="text-xs tabular-nums text-zinc-500">
                    {formatUsd(item.unitPriceUsd)} c/u
                  </p>
                ) : null}
              </div>

              <div className="txn-checkout-item-qty">
                <button
                  type="button"
                  className="txn-qty-btn"
                  disabled={item.quantity <= 1}
                  onClick={() =>
                    onUpdateQuantity(
                      item.product.product_id,
                      item.variantId,
                      item.quantity - 1,
                      item.modifiers,
                    )
                  }
                  aria-label="Reducir cantidad"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="txn-qty-btn"
                  onClick={() =>
                    onUpdateQuantity(
                      item.product.product_id,
                      item.variantId,
                      item.quantity + 1,
                      item.modifiers,
                    )
                  }
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
