"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useMercadoCart } from "@/components/mercado-oculto/MercadoCartProvider";
import { formatUsd } from "@/lib/format";

interface MercadoProductBuyBoxProps {
  productId: string;
  productName: string;
  priceUsd: number;
  availableStock: number;
  thumbUrl: string | null;
  supplierLabel: string;
}

export function MercadoProductBuyBox({
  productId,
  productName,
  priceUsd,
  availableStock,
  thumbUrl,
  supplierLabel,
}: MercadoProductBuyBoxProps) {
  const router = useRouter();
  const { addItem } = useMercadoCart();
  const maxQty = Math.max(1, availableStock || 99);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  function clampQty(value: number) {
    return Math.min(maxQty, Math.max(1, value));
  }

  function handleAdd() {
    addItem({
      productId,
      productName,
      priceUsd,
      quantity,
      thumbUrl,
      supplierLabel,
      availableStock,
    });
    setFeedback(`Agregaste ${quantity} al carrito`);
    window.setTimeout(() => setFeedback(null), 2200);
  }

  function handleBuyNow() {
    addItem({
      productId,
      productName,
      priceUsd,
      quantity,
      thumbUrl,
      supplierLabel,
      availableStock,
    });
    router.push("/mercado-oculto/carrito");
  }

  return (
    <div className="mercado-ml-buybox">
      <p className="mercado-ml-buybox-price">{formatUsd(priceUsd)}</p>
      <p className="mercado-ml-buybox-hint">Precio mayorista · costo base</p>

      <div className="mercado-ml-qty">
        <label htmlFor={`qty-${productId}`}>Cantidad</label>
        <div className="mercado-ml-qty-controls">
          <button
            type="button"
            aria-label="Disminuir cantidad"
            onClick={() => setQuantity((q) => clampQty(q - 1))}
          >
            −
          </button>
          <input
            id={`qty-${productId}`}
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(event) =>
              setQuantity(clampQty(Number(event.target.value) || 1))
            }
          />
          <button
            type="button"
            aria-label="Aumentar cantidad"
            onClick={() => setQuantity((q) => clampQty(q + 1))}
          >
            +
          </button>
        </div>
        <span className="mercado-ml-qty-stock">
          {availableStock > 0
            ? `${availableStock} disponibles`
            : "Stock a confirmar"}
        </span>
      </div>

      <button type="button" className="mercado-ml-btn-primary" onClick={handleBuyNow}>
        Comprar ahora
      </button>
      <button type="button" className="mercado-ml-btn-secondary" onClick={handleAdd}>
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Agregar al carrito
      </button>

      {feedback ? (
        <p className="mercado-ml-buybox-feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
