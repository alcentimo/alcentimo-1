"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
} from "@/lib/products/variants";
import type { CatalogVariantOption } from "@/lib/products/variants";

interface ProductCardProps {
  product: CatalogListItem;
  cartQuantity?: number;
  onAddToCart?: (product: CatalogListItem, variant: CatalogVariantOption) => void;
}

function StockBadge({
  availableStock,
  threshold,
}: {
  availableStock: number;
  threshold: number;
}) {
  if (availableStock <= 0) {
    return (
      <span className="store-stock-badge store-stock-badge-out">
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

export function ProductCard({ product, cartQuantity = 0, onAddToCart }: ProductCardProps) {
  const variantOptions = useMemo(
    () => getCatalogVariantOptions(product, product.exchange_rate_used),
    [product],
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
  const activeStock = selectedVariant?.availableStock ?? 0;
  const remaining = Math.max(0, activeStock - cartQuantity);
  const canAdd = !outOfStock && remaining > 0 && onAddToCart && selectedVariant;

  const hasDiscount =
    product.compare_at_usd != null &&
    product.price_usd != null &&
    product.compare_at_usd > product.price_usd;

  function handleAdd() {
    if (!canAdd || !selectedVariant) return;
    onAddToCart(product, selectedVariant);
  }

  return (
    <article className={`store-product-card group ${outOfStock ? "opacity-90" : ""}`}>
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
          <div className="flex h-full w-full items-center justify-center bg-zinc-100">
            <span className="text-4xl font-semibold text-zinc-300">
              {product.product_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/55">
            <span className="store-stock-badge store-stock-badge-out px-4 py-2 text-sm">
              Agotado
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          {product.is_featured ? (
            <span className="store-featured-badge">Destacado</span>
          ) : (
            <span />
          )}
          <StockBadge
            availableStock={
              showVariantSelector
                ? variantOptions.reduce((sum, variant) => sum + variant.availableStock, 0)
                : product.available_stock
            }
            threshold={getLowStockThreshold(product)}
          />
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
        {product.category_name && (
          <p className="store-product-category">{product.category_name}</p>
        )}

        <h2 className="store-product-name">{product.product_name}</h2>

        {product.short_description && (
          <p className="store-product-desc">{product.short_description}</p>
        )}

        {showVariantSelector && (
          <div className="mt-3">
            <label htmlFor={`variant-${product.product_id}`} className="sr-only">
              Variante
            </label>
            <select
              id={`variant-${product.product_id}`}
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="store-cart-select w-full"
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
          </div>
        )}

        <div className="store-product-pricing">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="store-product-price-usd">
              {formatUsd(selectedVariant?.priceUsd ?? product.price_usd)}
            </p>
            {hasDiscount && (
              <p className="text-sm text-zinc-400 line-through">
                {formatUsd(product.compare_at_usd)}
              </p>
            )}
          </div>
          <p className="store-product-price-ves">
            {formatVes(selectedVariant?.priceVes ?? product.price_ves)}
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={handleAdd}
            className="store-add-btn-mobile sm:hidden"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar al carrito
          </button>
        )}
      </div>
    </article>
  );
}
