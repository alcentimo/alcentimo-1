"use client";

import { memo, useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVisibilitySettings } from "@/lib/store-settings/types";
import { getProductBodyLayoutClass } from "@/lib/store-settings/catalog-theme";
import { formatUsd, formatApproxBs } from "@/lib/format";
import { computeUsdToVes, computeProductDiscountPercent, isProductOnSale } from "@/lib/catalog/pricing";
import { cartItemKey, sumModifiersExtraUsd, type CartModifierSelection } from "@/lib/catalog/cart-types";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
} from "@/lib/products/variants";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { RubroCatalogVariantSlot } from "@/components/rubros/RubroCatalogVariantSlot";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
} from "@/lib/rubros/modules/alimentos";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const TechSpecsChips = dynamic(
  () =>
    import("@/components/rubros/tecnologia/TechSpecsChips").then(
      (mod) => mod.TechSpecsChips,
    ),
  { ssr: false },
);

const CollectibleBadges = dynamic(
  () =>
    import("@/components/rubros/coleccionables/CollectibleBadges").then(
      (mod) => mod.CollectibleBadges,
    ),
  { ssr: false },
);

const BeautyBadges = dynamic(
  () =>
    import("@/components/rubros/salud-belleza/BeautyBadges").then(
      (mod) => mod.BeautyBadges,
    ),
  { ssr: false },
);

interface ProductCardProps {
  product: CatalogListItem;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  catalogVisibility?: CatalogVisibilitySettings;
  cartQuantity?: number;
  referenceCatalog?: boolean;
  /** Rubro de la tienda: activa selectores de módulo (lazy). */
  storeRubro?: string | null;
  onAddToCart?: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: CartModifierSelection[],
  ) => void;
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
  catalogVisibility = {
    showStock: true,
    showDescription: true,
    showPrices: true,
  },
  cartQuantity = 0,
  referenceCatalog = false,
  storeRubro = null,
  onAddToCart,
}: ProductCardProps) {
  const cartContext = useCartOptional();
  const activeExchangeRate = exchangeRate ?? product.exchange_rate_used;

  const variantOptions = useMemo(
    () => getCatalogVariantOptions(product, activeExchangeRate),
    [product, activeExchangeRate],
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => variantOptions[0]?.id ?? product.default_variant_id,
  );
  const [selectedModifiers, setSelectedModifiers] = useState<
    CartModifierSelection[]
  >([]);

  const isAlimentos = storeUsesRubroProductModule(storeRubro, "alimentos");
  const isTecnologia = storeUsesRubroProductModule(storeRubro, "tecnologia");
  const isColeccionables = storeUsesRubroProductModule(
    storeRubro,
    "coleccionables",
  );
  const isSaludBelleza = storeUsesRubroProductModule(
    storeRubro,
    "salud-belleza",
  );
  const foodHasModifiers =
    isAlimentos &&
    hasFoodModifiers(parseFoodModifiersFromMetadata(product.metadata ?? null));
  const showVariantSelector = hasMultipleVariants(product);
  const showOrderOptions = showVariantSelector || foodHasModifiers;

  const selectedVariant = useMemo(
    () =>
      variantOptions.find((variant) => variant.id === selectedVariantId) ??
      variantOptions[0],
    [variantOptions, selectedVariantId],
  );

  const modifiersExtra = sumModifiersExtraUsd(selectedModifiers);
  const displayPriceUsd =
    (selectedVariant?.priceUsd ?? product.price_usd ?? 0) + modifiersExtra;

  const outOfStock = isProductOutOfStock(product);
  const { showStock, showDescription, showPrices } = catalogVisibility;
  const bodyLayoutClass = getProductBodyLayoutClass(catalogVisibility);
  const threshold = getLowStockThreshold(product);
  const displayStock = showVariantSelector
    ? (selectedVariant?.availableStock ?? 0)
    : product.available_stock;
  const showStockOverlay = showStock && outOfStock;
  const showStockBadge =
    showStock && !outOfStock && displayStock > 0 && displayStock <= threshold;
  const activeStock = selectedVariant?.availableStock ?? 0;
  const contextCartQuantity =
    cartContext?.items.find(
      (item) =>
        cartItemKey(
          item.product.product_id,
          item.variantId,
          item.modifiers,
        ) ===
        cartItemKey(product.product_id, selectedVariantId, selectedModifiers),
    )?.quantity ?? 0;
  const effectiveCartQuantity =
    cartQuantity > 0 ? cartQuantity : contextCartQuantity;
  const inCart = effectiveCartQuantity > 0;
  const remaining = Math.max(0, activeStock - effectiveCartQuantity);
  const canAddMore =
    !outOfStock && remaining > 0 && onAddToCart && selectedVariant;
  const showAddButton =
    !outOfStock && onAddToCart && selectedVariant && (canAddMore || inCart);

  const addButtonLabel = inCart
    ? `En carrito (${effectiveCartQuantity})`
    : "Agregar al carrito";

  const hasDiscount = isProductOnSale(product.compare_at_usd, product.price_usd);
  const discountPercent = computeProductDiscountPercent(
    product.compare_at_usd,
    product.price_usd,
  );
  const compareAtDisplayUsd =
    product.compare_at_usd != null && product.compare_at_usd > displayPriceUsd
      ? product.compare_at_usd
      : null;

  const selectedPriceVes =
    computeUsdToVes(displayPriceUsd, activeExchangeRate) ??
    selectedVariant?.priceVes ??
    product.price_ves;

  function handleAdd() {
    if (!canAddMore || !selectedVariant) return;
    onAddToCart?.(product, selectedVariant, selectedModifiers);
  }

  function renderAddButton(className: string) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={inCart && !canAddMore}
        className={cn(
          className,
          inCart && "store-add-btn-in-cart",
          inCart && canAddMore && "store-add-btn-in-cart-active",
          inCart && !canAddMore && "store-add-btn-in-cart-max",
        )}
        aria-label={
          inCart
            ? `${addButtonLabel}. ${canAddMore ? "Pulsa para añadir otro." : "Cantidad máxima en carrito."}`
            : addButtonLabel
        }
      >
        {inCart ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4" aria-hidden="true" />
        )}
        {addButtonLabel}
      </button>
    );
  }

  return (
    <article
      className={cn("store-product-card group h-full", outOfStock && "opacity-90")}
    >
      <div className="store-product-media">
        <ProductImageGallery
          product={product}
          imageClassName="store-product-image"
          fallbackClassName="store-product-media-fallback"
          loading="lazy"
          sizes={
            referenceCatalog
              ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          }
        />

        {showStockOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55">
            <StockBadge availableStock={0} threshold={threshold} emphasis />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
          <div className="flex flex-col items-start gap-1">
            {product.is_featured ? (
              <span className="store-featured-badge">Destacado</span>
            ) : null}
            {hasDiscount ? (
              <span className="store-sale-badge">
                Oferta{discountPercent != null ? ` −${discountPercent}%` : ""}
              </span>
            ) : null}
          </div>
          {showStockBadge ? (
            <StockBadge availableStock={displayStock} threshold={threshold} />
          ) : (
            <span aria-hidden="true" />
          )}
        </div>

        {showAddButton && (
          <div className="store-product-action">
            {renderAddButton("store-add-btn")}
          </div>
        )}
      </div>

      <div className="store-product-content">
        <div className={cn("store-product-body", bodyLayoutClass)}>
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
            {isTecnologia ? <TechSpecsChips product={product} /> : null}
            {isColeccionables ? <CollectibleBadges product={product} /> : null}
            {isSaludBelleza ? <BeautyBadges product={product} /> : null}
          </div>

        {showPrices ? (
            <div className="store-product-slot store-product-slot-pricing">
              <div className="store-product-price-row">
                <p className="store-product-price-usd">
                  {formatUsd(displayPriceUsd)}
                </p>
                {hasDiscount && compareAtDisplayUsd != null && (
                  <p className="store-product-price-compare">
                    {formatUsd(compareAtDisplayUsd)}
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
          ) : null}

          {showDescription ? (
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
          ) : null}

          <div className="store-product-slot store-product-slot-variant">
            {showOrderOptions ? (
              <RubroCatalogVariantSlot
                rubro={storeRubro}
                product={product}
                variantOptions={variantOptions}
                selectedVariantId={selectedVariantId}
                onSelect={setSelectedVariantId}
                selectedModifiers={selectedModifiers}
                onModifiersChange={setSelectedModifiers}
                showVariants={showVariantSelector}
              />
            ) : (
              <span className="store-product-variant-placeholder" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="store-product-footer sm:hidden">
          {showAddButton ? (
            renderAddButton("store-add-btn-mobile")
          ) : (
            <span className="store-product-footer-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
});
