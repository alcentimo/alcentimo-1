"use client";

import Link from "next/link";
import { ArrowUpRight, Package, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";
import { MercadoProductGallery } from "@/components/mercado-oculto/MercadoProductGallery";
import { cn } from "@/lib/cn";

interface MercadoProductGridProps {
  products: MercadoProductCard[];
  /** Por defecto: ficha de Mercado Oculto. */
  getProductHref?: (product: MercadoProductCard) => string;
  /**
   * Si se define, media/título/CTA disparan esta acción en lugar de navegar
   * (p. ej. vista previa del dashboard).
   */
  onProductActivate?: (product: MercadoProductCard) => void;
  priceLabel?: string;
  /** Texto al lado del precio (p. ej. tasa de referencia BCV). */
  priceHint?: string | null;
  /** Conversión o referencia bajo el precio base. */
  formatPriceSecondary?: (product: MercadoProductCard) => string | null;
  ctaLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  metaInStock?: string;
  metaOutOfStock?: string;
  onSelectBrand?: (brand: string) => void;
}

function defaultProductHref(product: MercadoProductCard): string {
  return `/mercado-oculto/producto/${product.product_id}`;
}

export function MercadoProductGrid({
  products,
  getProductHref = defaultProductHref,
  onProductActivate,
  priceLabel = "Mayorista",
  priceHint = null,
  formatPriceSecondary,
  ctaLabel = "Ver ficha",
  emptyTitle = "Nada en esta curaduría",
  emptyDescription = "Probá otra colección o limpiá la búsqueda. La vitrina se actualiza con nuevos mayoristas.",
  metaInStock = "Listo para tu catálogo",
  metaOutOfStock = "Reposición pendiente",
  onSelectBrand,
}: MercadoProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mercado-mp-empty">
        <Package className="h-8 w-8 text-emerald-800/60" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-[var(--mo-ink)]">
          {emptyTitle}
        </p>
        <p className="mt-1 max-w-md text-[var(--mo-muted)] text-sm">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <ul className="mercado-mp-grid">
      {products.map((product, index) => {
        const inStock = product.available_stock > 0;
        const showDiscount =
          inStock &&
          product.discount_percent != null &&
          product.compare_at_usd != null &&
          product.compare_at_usd > product.price_usd;
        const showFreeShipping = inStock && product.free_shipping;
        const href = getProductHref(product);
        const activate = onProductActivate
          ? () => onProductActivate(product)
          : undefined;
        const priceSecondary = formatPriceSecondary?.(product) ?? null;

        return (
          <li key={product.product_id}>
            <article className="group mercado-mp-card">
              <div className="mercado-mp-card-media">
                {activate ? (
                  <MercadoCardMedia
                    product={product}
                    onOpen={activate}
                    priority={index < 8}
                  />
                ) : (
                  <Link href={href} className="block" prefetch>
                    <MercadoCardMedia product={product} priority={index < 8} />
                  </Link>
                )}
              </div>

              <div className="mercado-mp-card-body">
                {product.brand ? (
                  onSelectBrand ? (
                    <button
                      type="button"
                      className="mercado-mp-card-brand"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSelectBrand(product.brand as string);
                      }}
                    >
                      {product.brand}
                    </button>
                  ) : (
                    <p className="mercado-mp-card-brand">{product.brand}</p>
                  )
                ) : (
                  <p className="mercado-mp-card-supplier">
                    {product.supplier_label}
                  </p>
                )}
                {onProductActivate ? (
                  <button
                    type="button"
                    className="mercado-mp-card-title text-left"
                    onClick={activate}
                  >
                    {product.product_name}
                  </button>
                ) : (
                  <Link href={href} className="mercado-mp-card-title" prefetch>
                    {product.product_name}
                  </Link>
                )}

                <div className="mercado-mp-card-pricing">
                  {showDiscount ? (
                    <p className="mercado-mp-card-compare">
                      {formatUsd(product.compare_at_usd)}
                    </p>
                  ) : null}
                  <p className="mercado-mp-card-price">
                    <span className="mercado-mp-card-price-label">
                      {priceLabel}
                    </span>
                    {formatUsd(product.price_usd)}
                    {priceHint ? (
                      <span className="mercado-mp-card-price-hint">
                        {priceHint}
                      </span>
                    ) : null}
                  </p>
                  {priceSecondary ? (
                    <p className="mercado-mp-card-price-secondary">
                      {priceSecondary}
                    </p>
                  ) : null}
                </div>

                {showFreeShipping ? (
                  <p className="mercado-mp-free-ship">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    Envío incluido
                  </p>
                ) : (
                  <p className="mercado-mp-card-meta">
                    {inStock ? metaInStock : metaOutOfStock}
                  </p>
                )}

                <div className="mercado-mp-card-actions">
                  {onProductActivate ? (
                    <button
                      type="button"
                      className="mercado-mp-card-btn"
                      onClick={activate}
                    >
                      {ctaLabel}
                      <ArrowUpRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <Link href={href} className="mercado-mp-card-btn">
                      {ctaLabel}
                      <ArrowUpRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function MercadoCardMedia({
  product,
  onOpen,
  priority = false,
}: {
  product: MercadoProductCard;
  onOpen?: () => void;
  priority?: boolean;
}) {
  const inStock = product.available_stock > 0;
  const showDiscount =
    inStock &&
    product.discount_percent != null &&
    product.compare_at_usd != null &&
    product.compare_at_usd > product.price_usd;
  const imageUrls =
    product.gallery_urls?.length
      ? product.gallery_urls
      : product.thumb_url
        ? [product.thumb_url]
        : [];

  return (
    <>
      <MercadoProductGallery
        productName={product.product_name}
        imageUrls={imageUrls}
        product={{
          product_slug: product.product_slug,
          thumb_url: product.thumb_url,
        }}
        mode="card"
        onMediaClick={onOpen}
        loading={priority ? "eager" : "lazy"}
      />
      <div className="mercado-mp-card-status-row">
        {showDiscount ? (
          <span className="mercado-mp-status mercado-mp-status-promo">
            −{product.discount_percent}%
          </span>
        ) : null}
        <span
          className={cn(
            "mercado-mp-status",
            inStock ? "mercado-mp-status-stock" : "mercado-mp-status-out",
          )}
        >
          {inStock ? "Disponible" : "Sin stock"}
        </span>
      </div>
    </>
  );
}
