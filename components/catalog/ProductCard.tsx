"use client";

import { memo, useMemo, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd, formatApproxBs } from "@/lib/format";
import { computeUsdToVes } from "@/lib/catalog/pricing";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
} from "@/lib/products/variants";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { cn } from "@/lib/cn";

interface ProductCardProps {
  product: CatalogListItem;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  cartQuantity?: number;
  onAddToCart?: (product: CatalogListItem, variant: CatalogVariantOption) => void;
}

function StockBadge({
  availableStock,
  threshold,
  emphasis = false,
}: {
  availableStock: number;
  threshold: number;
  emphasis?: boolean;
}) {
  if (availableStock <= 0) {
    return (
      <span
        className={cn(
          "store-stock-badge store-stock-badge-out",
          emphasis && "store-stock-badge-emphasis",
        )}
      >
        Agotado
      </span>
    );
  }

  if (availableStock <= threshold) {
    return (
      <span className="store-stock-badge store-stock-badge-low">
        Últimas {availableStock}
      </span>
    );
  }

  return null;
}

export const ProductCard = memo(function ProductCard({
  product,
  exchangeRate = null,
  showBsConversion = true,
  cartQuantity = 0,
  onAddToCart,
}: ProductCardProps) {
  const activeExchangeRate = exchangeRate ?? product.exchange_rate_used;

  const variantOptions = useMemo(
    () => getCatalogVariantOptions(product, activeExchangeRate),
    [product, activeExchangeRate],
  );
  const showVariantSelector = hasMultipleVariants(product);
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => variantOptions[0]?.id ?? product.default_variant_id,
  );

  const selectedVariant = useMemo(
    () =>
      variantOptions.find((variant) => variant.id === selectedVariantId) ??
      variantOptions[0],
    [variantOptions, selectedVariantId],
  );

  const outOfStock = isProductOutOfStock(product);
  const threshold = getLowStockThreshold(product);
  const displayStock = showVariantSelector
    ? (selectedVariant?.availableStock ?? 0)
    : product.available_stock;
  const showStockOverlay = outOfStock;
  const showStockBadge =
    !outOfStock && displayStock > 0 && displayStock <= threshold;
  const activeStock = selectedVariant?.availableStock ?? 0;
  const remaining = Math.max(0, activeStock - cartQuantity);
  const canAdd = !outOfStock && remaining > 0 && onAddToCart && selectedVariant;

  const hasDiscount =
    product.compare_at_usd != null &&
    product.price_usd != null &&
    product.compare_at_usd > product.price_usd;

  const selectedPriceVes =
    computeUsdToVes(selectedVariant?.priceUsd ?? product.price_usd, activeExchangeRate) ??
    selectedVariant?.priceVes ??
    product.price_ves;

  function handleAdd() {
    if (!canAdd || !selectedVariant) return;
    onAddToCart(product, selectedVariant);
  }

  return (
    <article
      className={cn("store-product-card group h-full", outOfStock && "opacity-90")}
    >
      <div className="store-product-media">
        {product.thumb_url ? (
          <Image
            src={product.thumb_url}
            alt={product.image_alt ?? product.product_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="store-product-image"
            loading="lazy"
          />
        ) : (
          <div className="store-product-media-fallback" aria-hidden="true">
            <span className="store-product-media-fallback-label">
              {product.product_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {showStockOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55">
            <StockBadge availableStock={0} threshold={threshold} emphasis />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          {product.is_featured ? (
            <span className="store-featured-badge">Destacado</span>
          ) : (
            <span aria-hidden="true" />
          )}
          {showStockBadge ? (
            <StockBadge availableStock={displayStock} threshold={threshold} />
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        {canAdd && (
          <div className="store-product-action">
            <button type="button" onClick={handleAdd} className="store-add-btn">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar al carrito
            </button>
          </div>
        )}
      </div>

      <div className="store-product-body">
        <div className="store-product-slot store-product-slot-meta">
          <p
            className={cn(
              "store-product-category",
              !product.category_name && "store-product-slot-empty",
            )}
          >
            {product.category_name ?? "\u00A0"}
          </p>
        </div>

        <div className="store-product-slot store-product-slot-title">
          <h2 className="store-product-name">{product.product_name}</h2>
        </div>

        <div className="store-product-slot store-product-slot-desc">
          <p
            className={cn(
              "store-product-desc",
              !product.short_description && "store-product-slot-empty",
            )}
          >
            {product.short_description ?? "\u00A0"}
          </p>
        </div>

        <div className="store-product-slot store-product-slot-variant">
          {showVariantSelector ? (
            <>
              <label htmlFor={`variant-${product.product_id}`} className="sr-only">
                Variante
              </label>
              <select
                id={`variant-${product.product_id}`}
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="store-cart-select store-product-variant-select w-full"
              >
                {variantOptions.map((variant) => (
                  <option
                    key={variant.id}
                    value={variant.id}
                    disabled={variant.availableStock <= 0}
                  >
                    {variant.name}
                    {variant.priceExtraUsd > 0
                      ? ` (+${formatUsd(variant.priceExtraUsd)})`
                      : ""}
                    {variant.availableStock <= 0 ? " — Agotado" : ""}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="store-product-variant-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="store-product-slot store-product-slot-pricing">
          <div className="store-product-price-row">
            <p className="store-product-price-usd">
              {formatUsd(selectedVariant?.priceUsd ?? product.price_usd)}
            </p>
            {hasDiscount && (
              <p className="store-product-price-compare">
                {formatUsd(product.compare_at_usd)}
              </p>
            )}
          </div>
          {showBsConversion ? (
            <p className="store-product-price-ves">
              {formatApproxBs(selectedPriceVes)}
            </p>
          ) : (
            <span className="store-product-price-ves-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="store-product-slot store-product-slot-action">
          {canAdd ? (
            <button
              type="button"
              onClick={handleAdd}
              className="store-add-btn-mobile sm:hidden"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar al carrito
            </button>
          ) : (
            <span
              className="store-product-action-placeholder sm:hidden"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </article>
  );
});
