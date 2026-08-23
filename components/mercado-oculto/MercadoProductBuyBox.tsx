"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Truck } from "lucide-react";
import { useMercadoCart } from "@/components/mercado-oculto/MercadoCartProvider";
import { MercadoFashionVariantPicker } from "@/components/mercado-oculto/MercadoFashionVariantPicker";
import { buildMercadoLoginHref } from "@/lib/mercado-oculto/access";
import { formatUsd } from "@/lib/format";
import {
  listSupplierFashionCatalogSkus,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";

interface MercadoProductBuyBoxProps {
  productId: string;
  productName: string;
  priceUsd: number;
  compareAtUsd?: number | null;
  discountPercent?: number | null;
  freeShipping?: boolean;
  availableStock: number;
  thumbUrl: string | null;
  supplierUserId: string;
  supplierLabel: string;
  isAuthenticated: boolean;
  variants?: SupplierProductVariants | null;
}

export function MercadoProductBuyBox({
  productId,
  productName,
  priceUsd,
  compareAtUsd = null,
  discountPercent = null,
  freeShipping = false,
  availableStock,
  thumbUrl,
  supplierUserId,
  supplierLabel,
  isAuthenticated,
  variants = null,
}: MercadoProductBuyBoxProps) {
  const router = useRouter();
  const { addItem } = useMercadoCart();
  const fashionSkus = useMemo(
    () => (variants ? listSupplierFashionCatalogSkus(variants) : []),
    [variants],
  );
  const firstAvailable =
    fashionSkus.find((sku) => sku.stock > 0) ?? fashionSkus[0] ?? null;
  const [selectedSkuId, setSelectedSkuId] = useState(firstAvailable?.id ?? "");
  const selectedSku =
    fashionSkus.find((sku) => sku.id === selectedSkuId) ?? firstAvailable;

  const unitPrice = selectedSku?.priceUsd || priceUsd;
  const stock =
    selectedSku != null ? selectedSku.stock : availableStock;
  const maxQty = Math.max(1, stock || 99);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const showDiscount =
    stock > 0 &&
    discountPercent != null &&
    compareAtUsd != null &&
    compareAtUsd > unitPrice;

  function clampQty(value: number) {
    return Math.min(maxQty, Math.max(1, value));
  }

  function pushItemToCart() {
    addItem({
      productId,
      variantId: selectedSku?.id,
      productName: selectedSku
        ? `${productName} · ${selectedSku.label}`
        : productName,
      priceUsd: unitPrice,
      quantity,
      thumbUrl,
      supplierUserId,
      supplierLabel,
      availableStock: stock,
    });
  }

  function handleAdd() {
    pushItemToCart();
    setFeedback(`¡Listo! Agregaste ${quantity} al carrito`);
    window.setTimeout(() => setFeedback(null), 2200);
  }

  function handleBuyNow() {
    pushItemToCart();
    if (!isAuthenticated) {
      router.push(buildMercadoLoginHref("/mercado-oculto/carrito"));
      return;
    }
    router.push("/mercado-oculto/carrito");
  }

  return (
    <div className="mercado-ml-buybox">
      {showDiscount ? (
        <div className="mercado-ml-buybox-promo">
          <span className="mercado-mp-discount-badge static">
            {discountPercent}% OFF
          </span>
          <p className="mercado-mp-card-compare">{formatUsd(compareAtUsd)}</p>
        </div>
      ) : null}
      <p className="mercado-ml-buybox-price">{formatUsd(unitPrice)}</p>
      <p className="mercado-ml-buybox-hint">
        Compra protegida · Pago contra entrega disponible
      </p>
      {freeShipping && stock > 0 ? (
        <p className="mercado-mp-free-ship">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          Envío gratis a nivel nacional
        </p>
      ) : (
        <p className="mercado-ml-buybox-hint">Envío a nivel nacional</p>
      )}

      {fashionSkus.length > 0 && selectedSku ? (
        <MercadoFashionVariantPicker
          productId={productId}
          skus={fashionSkus}
          selectedId={selectedSku.id}
          onSelect={(sku) => {
            setSelectedSkuId(sku.id);
            setQuantity(1);
          }}
        />
      ) : null}

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
          {stock > 0
            ? `${stock} disponibles`
            : "Agotado temporalmente"}
        </span>
      </div>

      <button
        type="button"
        className="mercado-ml-btn-primary"
        onClick={handleBuyNow}
        disabled={stock <= 0}
      >
        Comprar ahora
      </button>
      <button
        type="button"
        className="mercado-ml-btn-secondary"
        onClick={handleAdd}
        disabled={stock <= 0}
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Agregar al carrito
      </button>

      {!isAuthenticated ? (
        <p className="mercado-ml-buybox-hint">
          Podés armar el carrito sin cuenta. Para comprar o finalizar el pedido
          te pediremos crear una cuenta o iniciar sesión.
        </p>
      ) : null}

      {feedback ? (
        <p className="mercado-ml-buybox-feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
