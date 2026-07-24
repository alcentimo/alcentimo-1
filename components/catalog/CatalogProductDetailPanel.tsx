"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import { RubroCatalogVariantSlot } from "@/components/rubros/RubroCatalogVariantSlot";
import {
  WholesaleCatalogHint,
  WholesalePriceBadge,
} from "@/components/catalog/WholesalePriceBadge";
import { fetchCatalogProductDetail } from "@/lib/catalog/fetch-catalog-product-detail";
import type { CatalogProductGalleryImage } from "@/lib/products/product-gallery-types";
import {
  computeProductDiscountPercent,
  computeUsdToVes,
  formatWholesaleHint,
  hasWholesalePricing,
  isProductOnSale,
  resolveUnitPriceUsd,
} from "@/lib/catalog/pricing";
import {
  cartItemKey,
  sumModifiersExtraUsd,
} from "@/lib/catalog/cart-types";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
} from "@/lib/products/variants";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import { formatApproxBs, formatUsd } from "@/lib/format";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
} from "@/lib/rubros/modules/alimentos";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
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
const StationeryBadges = dynamic(
  () =>
    import("@/components/rubros/papeleria-libreria-oficina/StationeryBadges").then(
      (mod) => mod.StationeryBadges,
    ),
  { ssr: false },
);

interface CatalogProductDetailPanelProps {
  product: CatalogListItem;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  onClose: () => void;
  onAddToCart?: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: CartModifierSelection[],
  ) => void;
}

function formatAttributeLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CatalogProductDetailPanel({
  product,
  exchangeRate = null,
  showBsConversion = true,
  storeRubro = null,
  wholesaleEnabled = false,
  onClose,
  onAddToCart,
}: CatalogProductDetailPanelProps) {
  const cartContext = useCartOptional();
  const activeExchangeRate = exchangeRate ?? product.exchange_rate_used;

  const [detailDescription, setDetailDescription] = useState<string | null>(null);
  const [detailImages, setDetailImages] = useState<CatalogProductGalleryImage[]>(
    [],
  );
  const [detailLoading, setDetailLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailDescription(null);
    setDetailImages([]);

    void fetchCatalogProductDetail(product.store_slug, product.product_slug).then(
      (result) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (result.detail) {
          setDetailDescription(result.detail.description);
          setDetailImages(result.detail.images);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [product.product_id, product.product_slug, product.store_slug]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedVariant = useMemo(
    () =>
      variantOptions.find((variant) => variant.id === selectedVariantId) ??
      variantOptions[0],
    [variantOptions, selectedVariantId],
  );

  const modifiersExtra = sumModifiersExtraUsd(selectedModifiers);
  const retailDisplayUsd =
    (selectedVariant?.priceUsd ?? product.price_usd ?? 0) + modifiersExtra;
  const wholesaleConfigured = hasWholesalePricing(
    product.wholesale_price_usd,
    product.wholesale_min_qty,
    wholesaleEnabled,
  );

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

  const previewQty = Math.max(1, contextCartQuantity || 1);
  const activePricing = resolveUnitPriceUsd({
    retailUsd: product.price_usd ?? 0,
    wholesalePriceUsd: product.wholesale_price_usd,
    wholesaleMinQty: product.wholesale_min_qty,
    quantity: previewQty,
    priceExtraUsd: (selectedVariant?.priceExtraUsd ?? 0) + modifiersExtra,
    wholesaleEnabled,
  });
  const displayPriceUsd = activePricing.unitPriceUsd;

  const outOfStock = isProductOutOfStock(product);
  const threshold = getLowStockThreshold(product);
  const showVariantSelector = hasMultipleVariants(product);
  const displayStock = showVariantSelector
    ? (selectedVariant?.availableStock ?? 0)
    : product.available_stock;
  const remaining = Math.max(0, displayStock - contextCartQuantity);
  const canAddMore =
    !outOfStock && remaining > 0 && onAddToCart && selectedVariant;
  const inCart = contextCartQuantity > 0;

  const hasDiscount = isProductOnSale(product.compare_at_usd, product.price_usd);
  const discountPercent = computeProductDiscountPercent(
    product.compare_at_usd,
    product.price_usd,
  );
  const priceVes =
    computeUsdToVes(displayPriceUsd, activeExchangeRate) ?? product.price_ves;

  const isAlimentos = storeUsesRubroProductModule(storeRubro, "alimentos");
  const foodHasModifiers =
    isAlimentos &&
    hasFoodModifiers(parseFoodModifiersFromMetadata(product.metadata ?? null));
  const showOrderOptions = showVariantSelector || foodHasModifiers;

  const attributeEntries = useMemo(() => {
    const attrs = product.default_attributes ?? {};
    return Object.entries(attrs).filter(
      ([, value]) => typeof value === "string" && value.trim().length > 0,
    );
  }, [product.default_attributes]);

  const descriptionText =
    detailDescription?.trim() ||
    product.short_description?.trim() ||
    null;

  function handleAdd() {
    if (!canAddMore || !selectedVariant) return;
    onAddToCart?.(product, selectedVariant, selectedModifiers);
  }

  return (
    <div className="product-detail-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="product-detail-backdrop"
        aria-label="Cerrar detalle del producto"
        onClick={onClose}
      />

      <div className="product-detail-panel">
        <header className="product-detail-header">
          <p className="product-detail-kicker">{product.category_name}</p>
          <button
            type="button"
            onClick={onClose}
            className="product-detail-close"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="product-detail-scroll">
          <div className="product-detail-media">
            <ProductImageGallery
              product={product}
              images={detailImages.length > 0 ? detailImages : undefined}
              mode="detail"
              className="product-detail-gallery"
              imageClassName="product-detail-gallery-image"
              fallbackClassName="product-detail-gallery-fallback"
              loading="eager"
              sizes="(max-width: 768px) 100vw, 560px"
            />
          </div>

          <div className="product-detail-body">
            <h2 className="product-detail-title">{product.product_name}</h2>

            {product.brand ? (
              <p className="product-detail-brand">Marca: {product.brand}</p>
            ) : null}

            {storeUsesRubroProductModule(storeRubro, "tecnologia") ? (
              <TechSpecsChips product={product} />
            ) : null}
            {storeUsesRubroProductModule(storeRubro, "coleccionables") ? (
              <CollectibleBadges product={product} />
            ) : null}
            {storeUsesRubroProductModule(storeRubro, "salud-belleza") ? (
              <BeautyBadges product={product} />
            ) : null}
            {storeUsesRubroProductModule(storeRubro, "papeleria-libreria-oficina") ? (
              <StationeryBadges product={product} />
            ) : null}

            <div className="product-detail-pricing">
              <div className="product-detail-price-row">
                <p className="product-detail-price">{formatUsd(displayPriceUsd)}</p>
                {hasDiscount && product.compare_at_usd != null ? (
                  <p className="product-detail-price-compare">
                    {formatUsd(product.compare_at_usd)}
                    {discountPercent != null ? ` · −${discountPercent}%` : ""}
                  </p>
                ) : null}
              </div>

              {showBsConversion && priceVes != null ? (
                <p className="product-detail-price-ves">{formatApproxBs(priceVes)}</p>
              ) : null}

              {wholesaleConfigured &&
              product.wholesale_price_usd != null &&
              product.wholesale_min_qty != null ? (
                <div className="product-detail-wholesale">
                  <p className="product-detail-wholesale-retail">
                    Detal: {formatUsd(retailDisplayUsd)}/u
                  </p>
                  <p className="product-detail-wholesale-tier">
                    {formatWholesaleHint(
                      product.wholesale_price_usd,
                      product.wholesale_min_qty,
                    )}
                  </p>
                </div>
              ) : null}

              {activePricing.wholesaleApplied ? (
                <WholesalePriceBadge className="mt-2" />
              ) : wholesaleConfigured ? (
                <WholesaleCatalogHint
                  wholesalePriceUsd={product.wholesale_price_usd as number}
                  wholesaleMinQty={product.wholesale_min_qty as number}
                  className="mt-2"
                />
              ) : null}
            </div>

            {attributeEntries.length > 0 ? (
              <dl className="product-detail-attributes">
                {attributeEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{formatAttributeLabel(key)}</dt>
                    <dd>{value as string}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {descriptionText ? (
              <section className="product-detail-description">
                <h3>Descripción</h3>
                <p>{descriptionText}</p>
              </section>
            ) : detailLoading ? (
              <div className="product-detail-loading">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando descripción…
              </div>
            ) : null}

            {showOrderOptions ? (
              <div className="product-detail-options">
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
              </div>
            ) : null}

            {!outOfStock && displayStock <= threshold ? (
              <p className="product-detail-stock-hint">
                Quedan {displayStock} disponibles
              </p>
            ) : null}
          </div>
        </div>

        {onAddToCart ? (
          <footer className="product-detail-footer safe-area-bottom">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAddMore && inCart}
              className={cn(
                "product-detail-add-btn",
                inCart && canAddMore && "product-detail-add-btn-in-cart",
              )}
            >
              {inCart ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {inCart
                ? canAddMore
                  ? `En carrito (${contextCartQuantity}) · Añadir otro`
                  : `En carrito (${contextCartQuantity})`
                : "Agregar al carrito"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
