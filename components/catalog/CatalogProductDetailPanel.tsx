"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, MessageCircle, Plus, X } from "lucide-react";
import { CatalogProductShareMenu } from "@/components/catalog/CatalogProductShareMenu";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { MercadoProductGallery } from "@/components/mercado-oculto/MercadoProductGallery";
import { RubroCatalogVariantSlot } from "@/components/rubros/RubroCatalogVariantSlot";
import { GiftCardAmountPicker } from "@/components/catalog/GiftCardAmountPicker";
import { useGiftCardsEnabled } from "@/components/catalog-transactional/GiftCardStorefrontProvider";
import { fetchCatalogProductDetail } from "@/lib/catalog/fetch-catalog-product-detail";
import {
  resolveCatalogProductImages,
  type CatalogProductGalleryImage,
} from "@/lib/products/product-gallery-types";
import { buildCartWhatsAppMessage } from "@/lib/catalog/cart-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import {
  computeUsdToVes,
  isProductOnSale,
  resolveUnitPriceUsd,
} from "@/lib/catalog/pricing";
import {
  buildCartItem,
  cartItemKey,
  sumModifiersExtraUsd,
} from "@/lib/catalog/cart-types";
import type { CheckoutType } from "@/lib/store-settings/types";
import {
  getCatalogVariantOptions,
  hasMultipleVariants,
  isProductOutOfStock,
  parseVariantsJson,
} from "@/lib/products/variants";
import {
  clampGiftCardCustomAmount,
  isGiftCardCatalogItem,
  isGiftCardCustomVariant,
} from "@/lib/gift-cards/catalog";
import {
  parseGiftCardDeliveryFromModifiers,
  stripGiftCardDeliveryModifiers,
  validateGiftCardDelivery,
} from "@/lib/gift-cards/delivery";
import { getLowStockThreshold } from "@/lib/inventory/stock-status";
import {
  resolveCartStockCap,
  shouldShowExactStockQuantity,
} from "@/lib/inventory/open-stock";
import { resolveCatalogProductBrand } from "@/lib/catalog/product-brand";
import { formatApproxBs, formatExchangeRate, formatUsd } from "@/lib/format";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
} from "@/lib/rubros/modules/alimentos";
import {
  normalizeStoreRubro,
  resolvePublicCategoryLabel,
} from "@/src/config/categories";
import { useCartOptional } from "@/components/catalog-transactional/CartProvider";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import dynamic from "next/dynamic";
import { bindHideOnScroll } from "@/lib/hooks/useHideOnScroll";
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
  showOfficialRate?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  checkoutType?: CheckoutType;
  whatsappPhone?: string | null;
  /** `page`: ficha a pantalla completa (Mercado Libre). `overlay`: modal (preview). */
  layout?: "overlay" | "page";
  catalogHref?: string;
  onClose?: () => void;
  onSelectBrand?: (brand: string) => void;
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

function ProductDetailActionButtons({
  onAddToCart,
  handleBuyNow,
  handleAdd,
  handleWhatsAppOrder,
  outOfStock,
  canAddMore,
  inCart,
  justAdded,
  contextCartQuantity,
  showWhatsAppOrder,
  whatsappReady,
  whatsappPrimary,
  canWhatsAppOrder,
}: {
  onAddToCart?: CatalogProductDetailPanelProps["onAddToCart"];
  handleBuyNow: () => void;
  handleAdd: () => void;
  handleWhatsAppOrder: () => void;
  outOfStock: boolean;
  canAddMore: boolean;
  inCart: boolean;
  justAdded: boolean;
  contextCartQuantity: number;
  showWhatsAppOrder: boolean;
  whatsappReady: boolean;
  whatsappPrimary: boolean;
  canWhatsAppOrder: boolean;
}) {
  return (
    <>
      {onAddToCart ? (
        <>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={outOfStock || (!canAddMore && !inCart)}
            className="product-detail-add-btn touch-manipulation"
          >
            Comprar ahora
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAddMore && inCart}
            className={cn(
              "product-detail-cart-btn touch-manipulation",
              justAdded && "store-add-btn-just-added",
            )}
          >
            {inCart || justAdded ? (
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
        </>
      ) : null}

      {showWhatsAppOrder && whatsappReady ? (
        <button
          type="button"
          onClick={handleWhatsAppOrder}
          disabled={!canWhatsAppOrder}
          className={cn(
            "flex w-full touch-manipulation items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60",
            whatsappPrimary || !onAddToCart
              ? "txn-whatsapp-primary-btn"
              : "txn-whatsapp-outline-btn !mt-0",
          )}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pedir por WhatsApp
        </button>
      ) : null}
    </>
  );
}

export function CatalogProductDetailPanel({
  product,
  exchangeRate = null,
  showBsConversion = true,
  showOfficialRate = false,
  storeRubro = null,
  wholesaleEnabled = false,
  checkoutType = "both",
  whatsappPhone = null,
  layout = "overlay",
  catalogHref,
  onClose,
  onSelectBrand,
  onAddToCart,
}: CatalogProductDetailPanelProps) {
  const cartContext = useCartOptional();
  const shellNav = useCatalogShellNavigationOptional();
  // Buyer PDP: cart is the primary path. WhatsApp only when the store is
  // WhatsApp-only (or cart is unavailable, e.g. reference/preview mode).
  // Gift cards always use the web cart so the code can be issued.
  const cartAvailable = Boolean(onAddToCart);
  const giftCardsEnabled = useGiftCardsEnabled();
  const isGiftCardProductEarly = isGiftCardCatalogItem(product);
  const showWhatsAppOrder =
    !(isGiftCardProductEarly && giftCardsEnabled && cartAvailable) &&
    (checkoutType === "direct_whatsapp" ||
      (checkoutType === "both" && !cartAvailable));
  const whatsappPrimary = !cartAvailable;
  const whatsappReady = Boolean(whatsappPhone?.trim());
  const activeExchangeRate = exchangeRate ?? product.exchange_rate_used;

  const [detailDescription, setDetailDescription] = useState<string | null>(null);
  const [detailImages, setDetailImages] = useState<CatalogProductGalleryImage[]>(
    () => resolveCatalogProductImages(product),
  );
  const [detailLoading, setDetailLoading] = useState(true);

  const variantOptions = useMemo(
    () => getCatalogVariantOptions(product, activeExchangeRate),
    [product, activeExchangeRate],
  );

  const [selectedVariantId, setSelectedVariantId] = useState(
    () => {
      const gift = isGiftCardCatalogItem(product);
      if (gift) {
        const preferred = variantOptions.find((option) =>
          option.name.replace(/[^0-9.]/g, "") === "25",
        );
        return preferred?.id ?? variantOptions[0]?.id ?? product.default_variant_id;
      }
      return variantOptions[0]?.id ?? product.default_variant_id;
    },
  );
  const [selectedModifiers, setSelectedModifiers] = useState<
    CartModifierSelection[]
  >([]);
  const [justAdded, setJustAdded] = useState(false);
  const justAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const compactBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailDescription(null);
    setDetailImages(resolveCatalogProductImages(product));

    void fetchCatalogProductDetail(product.store_slug, product.product_slug).then(
      (result) => {
        if (cancelled) return;
        setDetailLoading(false);
        if (result.detail) {
          setDetailDescription(result.detail.description);
          if (result.detail.images.length > 0) {
            setDetailImages(result.detail.images);
          }
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [product.product_id, product.product_slug, product.store_slug]);

  useEffect(() => {
    if (layout !== "overlay") return;

    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [layout, onClose]);

  const selectedVariant = useMemo(
    () =>
      variantOptions.find((variant) => variant.id === selectedVariantId) ??
      variantOptions[0],
    [variantOptions, selectedVariantId],
  );

  const modifiersExtra = sumModifiersExtraUsd(
    stripGiftCardDeliveryModifiers(selectedModifiers),
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

  const isGiftCardProduct = isGiftCardCatalogItem(product);
  const isGiftCard = isGiftCardProduct && giftCardsEnabled;
  const giftCardsBlocked = isGiftCardProduct && !giftCardsEnabled;
  const previewQty = Math.max(1, contextCartQuantity || 1);
  const activePricing = resolveUnitPriceUsd({
    retailUsd: product.price_usd ?? 0,
    wholesalePriceUsd: isGiftCard ? null : product.wholesale_price_usd,
    wholesaleMinQty: isGiftCard ? null : product.wholesale_min_qty,
    quantity: previewQty,
    priceExtraUsd: (selectedVariant?.priceExtraUsd ?? 0) + modifiersExtra,
    wholesaleEnabled: isGiftCard ? false : wholesaleEnabled,
  });
  const displayPriceUsd = activePricing.unitPriceUsd;

  const outOfStock = isProductOutOfStock(product);
  const threshold = getLowStockThreshold(product);
  const showVariantSelector = hasMultipleVariants(product);
  const displayStock = showVariantSelector
    ? (selectedVariant?.availableStock ?? 0)
    : product.available_stock;
  const stockCap = resolveCartStockCap(displayStock);
  const remaining = Math.max(0, stockCap - contextCartQuantity);
  const giftCustomSelected = useMemo(() => {
    if (!isGiftCard) return false;
    const parsed = parseVariantsJson(product.product_variants);
    const json = parsed.find((variant) => variant.id === selectedVariantId);
    return (
      isGiftCardCustomVariant(json?.attributes) ||
      /otro monto/i.test(selectedVariant?.name ?? "")
    );
  }, [isGiftCard, product.product_variants, selectedVariantId, selectedVariant?.name]);

  const giftCustomValid =
    !giftCustomSelected ||
    clampGiftCardCustomAmount(modifiersExtra) != null;
  const giftDeliveryValid =
    !isGiftCard ||
    validateGiftCardDelivery(
      parseGiftCardDeliveryFromModifiers(selectedModifiers),
    ).ok;

  const canAddMore =
    !giftCardsBlocked &&
    !outOfStock &&
    remaining > 0 &&
    onAddToCart &&
    selectedVariant &&
    giftCustomValid &&
    giftDeliveryValid;
  const inCart = contextCartQuantity > 0;

  const hasDiscount = isProductOnSale(product.compare_at_usd, product.price_usd);
  const priceVes =
    computeUsdToVes(displayPriceUsd, activeExchangeRate) ?? product.price_ves;

  const isAlimentos = storeUsesRubroProductModule(storeRubro, "alimentos");
  const publicCategoryLabel = resolvePublicCategoryLabel(
    product.category_slug,
    product.category_name,
    normalizeStoreRubro(storeRubro),
  );
  const brandName = resolveCatalogProductBrand(product);
  const foodHasModifiers =
    isAlimentos &&
    hasFoodModifiers(parseFoodModifiersFromMetadata(product.metadata ?? null));
  const showOrderOptions = showVariantSelector || foodHasModifiers || isGiftCard;

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

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const path = getStoreProductDeepLinkPath(
      product.store_slug,
      product.product_slug,
      { pathname: window.location.pathname },
    );
    return `${window.location.origin}${path}`;
  }, [product.product_slug, product.store_slug]);

  function handleAdd() {
    if (!canAddMore || !selectedVariant) return;
    onAddToCart?.(product, selectedVariant, selectedModifiers);
    setJustAdded(true);
    if (justAddedTimerRef.current) clearTimeout(justAddedTimerRef.current);
    justAddedTimerRef.current = setTimeout(() => setJustAdded(false), 420);
  }

  function handleBuyNow() {
    if (!selectedVariant || outOfStock) return;
    if (canAddMore) {
      onAddToCart?.(product, selectedVariant, selectedModifiers);
    } else if (!inCart) {
      return;
    }
    onClose?.();
    shellNav?.openCart();
  }

  function handleWhatsAppOrder() {
    const phone = whatsappPhone?.trim();
    if (!phone || !selectedVariant || outOfStock) return;

    const item = buildCartItem(
      product,
      selectedVariant,
      1,
      selectedModifiers,
      wholesaleEnabled,
    );
    const message = buildCartWhatsAppMessage({
      storeName: product.store_name,
      items: [item],
      subtotalUsd: item.unitPriceUsd,
    });
    const url = buildWhatsAppOrderUrl(phone, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const showFooter = Boolean(onAddToCart) || (showWhatsAppOrder && whatsappReady);
  const canWhatsAppOrder =
    showWhatsAppOrder &&
    whatsappReady &&
    Boolean(selectedVariant) &&
    !outOfStock &&
    giftCustomValid &&
    giftDeliveryValid;

  const isPage = layout === "page";

  const backHref = catalogHref || "/";

  useEffect(() => {
    const header = headerRef.current;
    const compact = compactBarRef.current;
    if (!header) return;

    function setCollapsed(hidden: boolean) {
      header.classList.toggle("product-detail-header--scroll-hidden", hidden);
      compact?.classList.toggle("product-detail-compact--visible", hidden);
    }

    if (isPage) {
      return bindHideOnScroll({
        topOffset: 48,
        delta: 10,
        getY: () => window.scrollY,
        onHiddenChange: setCollapsed,
        addListener: (handler) => {
          window.addEventListener("scroll", handler, { passive: true });
          return () => window.removeEventListener("scroll", handler);
        },
      });
    }

    const scroller = scrollRef.current;
    if (!scroller) return;
    return bindHideOnScroll({
      topOffset: 36,
      delta: 10,
      getY: () => scroller.scrollTop,
      onHiddenChange: setCollapsed,
      addListener: (handler) => {
        scroller.addEventListener("scroll", handler, { passive: true });
        return () => scroller.removeEventListener("scroll", handler);
      },
    });
  }, [isPage, product.product_id]);

  return (
    <div
      className={
        isPage
          ? "product-detail-page product-detail-enter"
          : "product-detail-overlay product-detail-overlay--immersive product-detail-enter"
      }
      role={isPage ? undefined : "dialog"}
      aria-modal={isPage ? undefined : true}
    >
      {isPage ? null : (
        <button
          type="button"
          className="product-detail-backdrop"
          aria-label="Cerrar detalle del producto"
          onClick={onClose}
        />
      )}

      <div className="product-detail-panel">
        <div ref={compactBarRef} className="product-detail-compact">
          {isPage ? (
            <Link href={backHref} className="product-detail-compact-back">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              className="product-detail-compact-back"
              onClick={onClose}
              aria-label="Volver al catálogo"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <p className="product-detail-compact-title">{product.product_name}</p>
        </div>
        <header ref={headerRef} className="product-detail-header">

          {isPage ? (
            <div className="product-detail-back-wrap">
              <Link href={backHref} className="product-detail-back">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al catálogo
              </Link>
              {publicCategoryLabel ? (
                <p className="product-detail-kicker">{publicCategoryLabel}</p>
              ) : null}
            </div>
          ) : (
            <div className="product-detail-back-wrap">
              <button
                type="button"
                className="product-detail-back"
                onClick={onClose}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al catálogo
              </button>
              {publicCategoryLabel ? (
                <p className="product-detail-kicker">{publicCategoryLabel}</p>
              ) : null}
            </div>
          )}
          <div className="product-detail-header-actions">
            <CatalogProductShareMenu
              productName={product.product_name}
              shareUrl={shareUrl || (typeof window !== "undefined" ? window.location.href : "")}
              priceUsd={displayPriceUsd}
              storeName={product.store_name}
            />
            {isPage ? null : (
              <button
                type="button"
                onClick={onClose}
                className="product-detail-close"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="product-detail-scroll">
          <div className="product-detail-media">
            <MercadoProductGallery
              productName={product.product_name}
              images={detailImages.length > 0 ? detailImages : undefined}
              product={{
                thumb_url: product.thumb_url,
                image_alt: product.image_alt,
                gallery_images: product.gallery_images,
                product_slug: product.product_slug,
                metadata: product.metadata,
                category_slug: product.category_slug,
              }}
              mode="detail"
              loading="eager"
              sizes="(max-width: 768px) 100vw, 560px"
            />
          </div>

          <div className="product-detail-body">
            {brandName ? (
              onSelectBrand ? (
                <button
                  type="button"
                  className="product-detail-brand product-detail-brand-link"
                  onClick={() => {
                    onSelectBrand(brandName);
                    onClose?.();
                  }}
                >
                  {brandName}
                </button>
              ) : (
                <p className="product-detail-brand">{brandName}</p>
              )
            ) : null}

            {isPage ? (
              <h1 className="product-detail-title">{product.product_name}</h1>
            ) : (
              <h2 className="product-detail-title">{product.product_name}</h2>
            )}

            <div className="product-detail-stock-row">
              {outOfStock ? (
                <span className="product-detail-stock-badge product-detail-stock-badge--out">
                  <span className="product-detail-stock-dot" aria-hidden="true" />
                  Agotado
                </span>
              ) : shouldShowExactStockQuantity(displayStock) &&
                displayStock <= threshold ? (
                <span className="product-detail-stock-badge product-detail-stock-badge--low">
                  <span className="product-detail-stock-dot" aria-hidden="true" />
                  En stock · Quedan {displayStock}
                </span>
              ) : (
                <span className="product-detail-stock-badge product-detail-stock-badge--in">
                  <span className="product-detail-stock-dot" aria-hidden="true" />
                  Disponible
                </span>
              )}
            </div>

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

            <div
              className={
                hasDiscount
                  ? "product-detail-pricing product-detail-pricing--sale"
                  : "product-detail-pricing"
              }
            >
              {hasDiscount ? (
                <span className="product-detail-sale-badge">OFERTA</span>
              ) : null}
              <div className="product-detail-price-row">
                {hasDiscount && product.compare_at_usd != null ? (
                  <p
                    className="product-detail-price-compare"
                    aria-label={`Precio regular ${formatUsd(product.compare_at_usd)}`}
                  >
                    {formatUsd(product.compare_at_usd)}
                  </p>
                ) : null}
                <p
                  className="product-detail-price"
                  aria-label={`Precio actual ${formatUsd(displayPriceUsd)}`}
                >
                  {formatUsd(displayPriceUsd)}
                </p>
              </div>

              {showBsConversion && priceVes != null ? (
                <p className="product-detail-price-ves">{formatApproxBs(priceVes)}</p>
              ) : null}
              {showOfficialRate &&
              activeExchangeRate != null &&
              Number.isFinite(activeExchangeRate) &&
              activeExchangeRate > 0 ? (
                <p className="product-detail-rate">
                  Tasa oficial BCV: Bs. {formatExchangeRate(activeExchangeRate)} / USD
                </p>
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
                {isGiftCard ? (
                  <GiftCardAmountPicker
                    product={product}
                    variantOptions={variantOptions}
                    selectedVariantId={selectedVariantId}
                    onSelectVariant={setSelectedVariantId}
                    selectedModifiers={selectedModifiers}
                    onModifiersChange={setSelectedModifiers}
                  />
                ) : (
                  <RubroCatalogVariantSlot
                    rubro={storeRubro}
                    product={product}
                    variantOptions={variantOptions}
                    selectedVariantId={selectedVariantId}
                    onSelect={setSelectedVariantId}
                    selectedModifiers={selectedModifiers}
                    onModifiersChange={setSelectedModifiers}
                    showVariants={showVariantSelector}
                    density="detail"
                  />
                )}
              </div>
            ) : null}

            {isGiftCard && !giftDeliveryValid && onAddToCart ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                Completa el correo del destinatario, de parte de y el mensaje
                para añadir al carrito.
              </p>
            ) : null}

            {showFooter ? (
              <div className="product-detail-actions">
                <ProductDetailActionButtons
                  onAddToCart={onAddToCart}
                  handleBuyNow={handleBuyNow}
                  handleAdd={handleAdd}
                  handleWhatsAppOrder={handleWhatsAppOrder}
                  outOfStock={outOfStock}
                  canAddMore={Boolean(canAddMore)}
                  inCart={inCart}
                  justAdded={justAdded}
                  contextCartQuantity={contextCartQuantity}
                  showWhatsAppOrder={showWhatsAppOrder}
                  whatsappReady={whatsappReady}
                  whatsappPrimary={whatsappPrimary}
                  canWhatsAppOrder={canWhatsAppOrder}
                />
              </div>
            ) : null}
          </div>
        </div>

        {showFooter ? (
          <footer className="product-detail-footer safe-area-bottom space-y-2">
            <ProductDetailActionButtons
              onAddToCart={onAddToCart}
              handleBuyNow={handleBuyNow}
              handleAdd={handleAdd}
              handleWhatsAppOrder={handleWhatsAppOrder}
              outOfStock={outOfStock}
              canAddMore={Boolean(canAddMore)}
              inCart={inCart}
              justAdded={justAdded}
              contextCartQuantity={contextCartQuantity}
              showWhatsAppOrder={showWhatsAppOrder}
              whatsappReady={whatsappReady}
              whatsappPrimary={whatsappPrimary}
              canWhatsAppOrder={canWhatsAppOrder}
            />
          </footer>
        ) : null}
      </div>
    </div>
  );
}
