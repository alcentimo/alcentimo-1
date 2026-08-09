"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVisibilitySettings } from "@/lib/store-settings/types";
import { getProductBodyLayoutClass } from "@/lib/store-settings/catalog-theme";
import { formatUsd, formatApproxBs } from "@/lib/format";
import {
  computeUsdToVes,
  hasWholesalePricing,
  isProductOnSale,
  resolveUnitPriceUsd,
} from "@/lib/catalog/pricing";
import {
  WholesaleCatalogHint,
  WholesalePriceBadge,
} from "@/components/catalog/WholesalePriceBadge";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import {
  shouldShowExactStockQuantity,
  resolveCartStockCap,
} from "@/lib/inventory/open-stock";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
} from "@/lib/products/variants";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
} from "@/lib/rubros/modules/alimentos";
import {
  normalizeStoreRubro,
  resolvePublicCategoryLabel,
} from "@/src/config/categories";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";

const EMPTY_MODIFIERS: CartModifierSelection[] = [];

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

const StationeryBadges = dynamic(
  () =>
    import("@/components/rubros/papeleria-libreria-oficina/StationeryBadges").then(
      (mod) => mod.StationeryBadges,
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
  onOpenDetail?: (product: CatalogListItem) => void;
  wholesaleEnabled?: boolean;
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

  if (!shouldShowExactStockQuantity(availableStock)) {
    return null;
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
  onOpenDetail,
  wholesaleEnabled = false,
}: ProductCardProps) {
  const cartContext = useCartOptional();
  const activeExchangeRate = exchangeRate ?? product.exchange_rate_used;

  const variantOptions = useMemo(
    () => getCatalogVariantOptions(product, activeExchangeRate),
    [product, activeExchangeRate],
  );
  const selectedVariant = variantOptions[0];

  const [justAdded, setJustAdded] = useState(false);
  const [plusOneTick, setPlusOneTick] = useState(0);
  const justAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    };
  }, []);

  const publicCategoryLabel = resolvePublicCategoryLabel(
    product.category_slug,
    product.category_name,
    normalizeStoreRubro(storeRubro),
  );
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
  const isPapeleria = storeUsesRubroProductModule(
    storeRubro,
    "papeleria-libreria-oficina",
  );

  const foodHasModifiers =
    isAlimentos &&
    hasFoodModifiers(parseFoodModifiersFromMetadata(product.metadata ?? null));
  const showVariantSelector = hasMultipleVariants(product);
  /** Variantes/mods se eligen en el detalle; «Añadir» usa la opción por defecto. */
  const hasConfigurableOptions = showVariantSelector || foodHasModifiers;

  const retailDisplayUsd = selectedVariant?.priceUsd ?? product.price_usd ?? 0;
  const wholesaleConfigured = hasWholesalePricing(
    product.wholesale_price_usd,
    product.wholesale_min_qty,
    wholesaleEnabled,
  );

  const outOfStock = isProductOutOfStock(product);
  const { showStock, showDescription, showPrices } = catalogVisibility;
  // El precio vive en el pie; el cuerpo se calcula sin fila de precio.
  const bodyLayoutClass = getProductBodyLayoutClass({
    ...catalogVisibility,
    showPrices: false,
  });
  const threshold = getLowStockThreshold(product);
  const displayStock = product.available_stock;
  const showStockOverlay = showStock && outOfStock;
  const showStockBadge =
    showStock &&
    !outOfStock &&
    shouldShowExactStockQuantity(displayStock) &&
    displayStock <= threshold;
  const activeStock = selectedVariant?.availableStock ?? product.available_stock;
  const contextCartQuantity =
    cartContext?.items
      .filter((item) => item.product.product_id === product.product_id)
      .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const effectiveCartQuantity =
    cartQuantity > 0 ? cartQuantity : contextCartQuantity;
  const activePricing = useMemo(() => {
    if (effectiveCartQuantity <= 0) return null;
    return resolveUnitPriceUsd({
      retailUsd: product.price_usd ?? 0,
      wholesalePriceUsd: product.wholesale_price_usd,
      wholesaleMinQty: product.wholesale_min_qty,
      quantity: effectiveCartQuantity,
      wholesaleEnabled,
      priceExtraUsd: selectedVariant?.priceExtraUsd ?? 0,
    });
  }, [
    effectiveCartQuantity,
    product.price_usd,
    product.wholesale_min_qty,
    product.wholesale_price_usd,
    selectedVariant?.priceExtraUsd,
    wholesaleEnabled,
  ]);
  const displayPriceUsd = activePricing?.unitPriceUsd ?? retailDisplayUsd;
  const wholesaleApplied = activePricing?.wholesaleApplied ?? false;
  const inCart = effectiveCartQuantity > 0;
  const remaining = Math.max(
    0,
    resolveCartStockCap(activeStock) - effectiveCartQuantity,
  );
  const canAddMore =
    !outOfStock && remaining > 0 && onAddToCart && selectedVariant;
  const showAddButton =
    Boolean(onAddToCart) &&
    !outOfStock &&
    Boolean(selectedVariant) &&
    (canAddMore || inCart);
  const showFooter = showPrices || showAddButton;

  const addButtonLabel = inCart
    ? `En carrito (${effectiveCartQuantity})`
    : hasConfigurableOptions
      ? "Añadir al carrito (opción por defecto)"
      : "Añadir al carrito";

  const hasDiscount = isProductOnSale(product.compare_at_usd, product.price_usd);
  /** Precio regular configurado: siempre visible en ofertas individuales. */
  const compareAtDisplayUsd =
    hasDiscount && product.compare_at_usd != null
      ? product.compare_at_usd
      : null;

  const selectedPriceVes =
    computeUsdToVes(displayPriceUsd, activeExchangeRate) ??
    selectedVariant?.priceVes ??
    product.price_ves;

  function handleAdd() {
    if (!canAddMore || !selectedVariant) return;
    onAddToCart?.(product, selectedVariant, EMPTY_MODIFIERS);
    setJustAdded(true);
    setPlusOneTick((tick) => tick + 1);
    if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    justAddedTimerRef.current = setTimeout(() => setJustAdded(false), 650);
  }

  function handleOpenDetail() {
    onOpenDetail?.(product);
  }

  function handleAddClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    handleAdd();
  }

  return (
    <article
      className={cn(
        "store-product-card group h-full w-full min-w-0",
        outOfStock && "opacity-90",
      )}
    >
      <div className="store-product-media-frame">
        <div
          className={cn(
            "store-product-media",
            onOpenDetail && "store-product-media-openable",
          )}
          onClick={onOpenDetail ? handleOpenDetail : undefined}
          onKeyDown={
            onOpenDetail
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenDetail();
                  }
                }
              : undefined
          }
          role={onOpenDetail ? "button" : undefined}
          tabIndex={onOpenDetail ? 0 : undefined}
          aria-label={
            onOpenDetail ? `Ver detalle de ${product.product_name}` : undefined
          }
        >
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

          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-2.5">
            <div className="flex flex-col items-start gap-1">
              {product.is_featured ? (
                <span className="store-featured-badge">Destacado</span>
              ) : null}
              {hasDiscount ? (
                <span className="store-sale-badge">OFERTA</span>
              ) : null}
            </div>
            {showStockBadge ? (
              <StockBadge availableStock={displayStock} threshold={threshold} />
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      <div className="store-product-content w-full min-w-0">
        <div className={cn("store-product-body w-full min-w-0", bodyLayoutClass)}>
          <div className="store-product-slot store-product-slot-meta">
            <p
              className={cn(
                "store-product-category",
                !publicCategoryLabel && "store-product-slot-empty",
              )}
            >
              {publicCategoryLabel ?? "\u00A0"}
            </p>
          </div>

          <div className="store-product-slot store-product-slot-title">
            {onOpenDetail ? (
              <button
                type="button"
                className="store-product-name store-product-name-open"
                onClick={handleOpenDetail}
              >
                {product.product_name}
              </button>
            ) : (
              <h2 className="store-product-name">{product.product_name}</h2>
            )}
            {isTecnologia ? <TechSpecsChips product={product} /> : null}
            {isColeccionables ? <CollectibleBadges product={product} /> : null}
            {isSaludBelleza ? <BeautyBadges product={product} /> : null}
            {isPapeleria ? <StationeryBadges product={product} /> : null}
          </div>

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
              {onOpenDetail ? (
                <button
                  type="button"
                  className="store-product-details-link"
                  onClick={handleOpenDetail}
                >
                  Ver detalles →
                </button>
              ) : null}
            </div>
          ) : onOpenDetail ? (
            <div className="store-product-slot store-product-slot-desc">
              <button
                type="button"
                className="store-product-details-link"
                onClick={handleOpenDetail}
              >
                Ver detalles →
              </button>
            </div>
          ) : null}
        </div>

        {showFooter ? (
          <div className="store-product-footer w-full min-w-0">
            {showPrices ? (
              <div
                className={cn(
                  "store-product-slot store-product-slot-pricing store-product-footer-pricing w-full min-w-0",
                  hasDiscount && "store-product-pricing--sale",
                )}
              >
                <div className="store-product-price-row min-w-0">
                  {compareAtDisplayUsd != null ? (
                    <p
                      className="store-product-price-compare"
                      aria-label={`Precio regular ${formatUsd(compareAtDisplayUsd)}`}
                    >
                      {formatUsd(compareAtDisplayUsd)}
                    </p>
                  ) : null}
                  <p
                    className="store-product-price-usd"
                    aria-label={`Precio actual ${formatUsd(displayPriceUsd)}`}
                  >
                    {formatUsd(displayPriceUsd)}
                  </p>
                </div>
                {showBsConversion ? (
                  <p className="store-product-price-ves">
                    {formatApproxBs(selectedPriceVes)}
                  </p>
                ) : (
                  <span
                    className="store-product-price-ves-placeholder"
                    aria-hidden="true"
                  />
                )}
                {wholesaleApplied ? (
                  <WholesalePriceBadge className="mt-1.5" compact />
                ) : wholesaleConfigured &&
                  product.wholesale_min_qty != null ? (
                  <WholesaleCatalogHint
                    wholesalePriceUsd={product.wholesale_price_usd as number}
                    wholesaleMinQty={product.wholesale_min_qty}
                    className="mt-1"
                  />
                ) : null}
              </div>
            ) : (
              <span className="store-product-footer-pricing-spacer" aria-hidden="true" />
            )}

            {showAddButton ? (
              <button
                type="button"
                onClick={handleAddClick}
                disabled={inCart && !canAddMore}
                className={cn(
                  "store-card-add-btn touch-manipulation",
                  inCart && "store-card-add-btn-in-cart",
                  inCart && canAddMore && "store-card-add-btn-active",
                  inCart && !canAddMore && "store-card-add-btn-max",
                  justAdded && "store-card-add-btn-just-added",
                )}
                aria-label={
                  justAdded
                    ? "Producto añadido al carrito"
                    : inCart
                      ? `${addButtonLabel}. ${canAddMore ? "Pulsa para añadir otro." : "Cantidad máxima en carrito."}`
                      : addButtonLabel
                }
                title={
                  hasConfigurableOptions
                    ? "Añade 1 unidad con la opción por defecto. Toca la foto o el nombre para elegir variantes."
                    : addButtonLabel
                }
              >
                {justAdded || (inCart && !justAdded) ? (
                  <Check className="store-card-add-btn-icon" aria-hidden="true" />
                ) : (
                  <ShoppingCart
                    className="store-card-add-btn-icon"
                    aria-hidden="true"
                  />
                )}
                <span className="store-card-add-btn-label">
                  {justAdded ? "¡Añadido!" : "Añadir"}
                </span>
                {inCart && effectiveCartQuantity > 0 && !justAdded ? (
                  <span className="store-card-add-btn-qty" aria-hidden="true">
                    {effectiveCartQuantity > 9 ? "9+" : effectiveCartQuantity}
                  </span>
                ) : null}
                {plusOneTick > 0 ? (
                  <span
                    key={plusOneTick}
                    className="store-add-btn-plus-one"
                    aria-hidden="true"
                  >
                    +1
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
});
