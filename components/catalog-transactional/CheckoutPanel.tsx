"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { cartItemKey } from "@/lib/catalog/cart-types";
import { formatUsd } from "@/lib/format";
import { useCart } from "@/components/catalog-transactional/CartProvider";
import { submitTransactionalOrder } from "@/lib/orders/actions";
import type { SubmitOrderLineInput } from "@/lib/orders/types";

interface CheckoutPanelProps {
  storeSlug: string;
  storeName: string;
  whatsappConfigured: boolean;
  onClose: () => void;
}

export function CheckoutPanel({
  storeSlug,
  storeName,
  whatsappConfigured,
  onClose,
}: CheckoutPanelProps) {
  const { items, subtotalUsd, updateQuantity, removeItem, clearCart } =
    useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const orderLines = useMemo<SubmitOrderLineInput[]>(
    () =>
      items.map((item) => ({
        productId: item.product.product_id,
        variantId: item.variantId,
        productName: item.product.product_name,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceUsd: item.unitPriceUsd,
      })),
    [items],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (!proofFile) {
      setError("Adjunta el comprobante de pago.");
      return;
    }

    const formData = new FormData();
    formData.set("storeSlug", storeSlug);
    formData.set("customerName", customerName.trim());
    formData.set("customerPhone", customerPhone.trim());
    formData.set("items", JSON.stringify(orderLines));
    formData.set("paymentProof", proofFile);

    startTransition(async () => {
      const result = await submitTransactionalOrder(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      clearCart();
      onClose();

      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      } else if (!whatsappConfigured) {
        setError(
          "Pedido guardado. La tienda aún no configuró WhatsApp en Ajustes.",
        );
      }
    });
  }

  return (
    <div className="txn-checkout">
      <header className="txn-checkout-header">
        <div>
          <h2 className="txn-checkout-title">Tu pedido</h2>
          <p className="txn-checkout-subtitle">{storeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="txn-icon-btn"
          aria-label="Cerrar carrito"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {items.length === 0 ? (
        <div className="txn-checkout-empty">
          <ShoppingBag className="h-8 w-8 text-zinc-300" aria-hidden="true" />
          <p className="mt-3 text-sm text-zinc-500">
            Añade productos del catálogo para empezar.
          </p>
        </div>
      ) : (
        <>
          <ul className="txn-checkout-items">
            {items.map((item) => {
              const key = cartItemKey(item.product.product_id, item.variantId);
              return (
                <li key={key} className="txn-checkout-item">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.product.product_name}
                    </p>
                    {item.variantName !== "Estándar" && (
                      <p className="text-xs text-zinc-500">{item.variantName}</p>
                    )}
                    <p className="mt-1 text-sm text-zinc-700">
                      {formatUsd(item.unitPriceUsd * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="txn-qty-btn"
                      onClick={() =>
                        updateQuantity(
                          item.product.product_id,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                      aria-label="Reducir cantidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="txn-qty-btn"
                      onClick={() =>
                        updateQuantity(
                          item.product.product_id,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="txn-remove-btn"
                    onClick={() =>
                      removeItem(item.product.product_id, item.variantId)
                    }
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="txn-checkout-total">
            <span>Total</span>
            <strong>{formatUsd(subtotalUsd)}</strong>
          </div>

          <form className="txn-checkout-form" onSubmit={handleSubmit}>
            <label className="txn-field">
              <span>Nombre</span>
              <input
                type="text"
                required
                minLength={2}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Tu nombre completo"
                className="txn-input"
              />
            </label>

            <label className="txn-field">
              <span>Teléfono / WhatsApp</span>
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                minLength={10}
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="Ej: 0414-1234567"
                className="txn-input"
              />
            </label>

            <label className="txn-field">
              <span>Comprobante de pago</span>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) =>
                  setProofFile(event.target.files?.[0] ?? null)
                }
                className="txn-file-input"
              />
            </label>

            {error && (
              <p className="txn-checkout-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="txn-submit-btn"
            >
              {pending ? "Procesando…" : "Finalizar y enviar por WhatsApp"}
            </button>

            {!whatsappConfigured && (
              <p className="txn-checkout-hint">
                Si WhatsApp no está configurado, el pedido se guardará igual en
                el panel del dueño.
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
