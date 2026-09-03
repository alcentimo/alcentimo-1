"use client";

import { memo } from "react";
import Link from "next/link";
import { ArrowUpRight, Package, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";
import { CatalogProductImage } from "@/components/catalog/CatalogProductImage";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";
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
      {products.map((product, index) => (
        <MercadoProductGridItem
          key={product.product_id}
          product={product}
          href={getProductHref(product)}
          activate={
            onProductActivate ? () => onProductActivate(product) : undefined
          }
          priceLabel={priceLabel}
          priceHint={priceHint}
          priceSecondary={formatPriceSecondary?.(product) ?? null}
          ctaLabel={ctaLabel}
          metaInStock={metaInStock}
          metaOutOfStock={metaOutOfStock}
          onSelectBrand={onSelectBrand}
          priority={index < 4}
        />
      ))}
    </ul>
  );
}

const MercadoProductGridItem = memo(function MercadoProductGridItem({
  product,
  href,
  activate,
  priceLabel,
  priceHint,
  priceSecondary,
  ctaLabel,
  metaInStock,
  metaOutOfStock,
  onSelectBrand,
  priority,
}: {
  product: MercadoProductCard;
  href: string;
  activate?: () => void;
  priceLabel: string;
  priceHint: string | null;
  priceSecondary: string | null;
  ctaLabel: string;
  metaInStock: string;
  metaOutOfStock: string;
  onSelectBrand?: (brand: string) => void;
  priority: boolean;
}) {
  const inStock = product.available_stock > 0;
  const showDiscount =
    inStock &&
    product.discount_percent != null &&
    product.compare_at_usd != null &&
    product.compare_at_usd > product.price_usd;
  const showFreeShipping = inStock && product.free_shipping;

  return (
    <li className="mercado-mp-grid-item">
      <article className="group mercado-mp-card">
        <div className="mercado-mp-card-media">
          {activate ? (
            <MercadoCardMedia
              product={product}
              onOpen={activate}
              priority={priority}
            />
          ) : (
            <Link href={href} className="block h-full w-full" prefetch={false}>
              <MercadoCardMedia product={product} priority={priority} />
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
            <p className="mercado-mp-card-supplier">{product.supplier_label}</p>
          )}
          {activate ? (
            <button
              type="button"
              className="mercado-mp-card-title text-left"
              onClick={activate}
            >
              {product.product_name}
            </button>
          ) : (
            <Link href={href} className="mercado-mp-card-title" prefetch={false}>
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
              <span className="mercado-mp-card-price-label">{priceLabel}</span>
              {formatUsd(product.price_usd)}
              {priceHint ? (
                <span className="mercado-mp-card-price-hint">{priceHint}</span>
              ) : null}
            </p>
            {priceSecondary ? (
              <p className="mercado-mp-card-price-secondary">{priceSecondary}</p>
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
            {activate ? (
              <button type="button" className="mercado-mp-card-btn" onClick={activate}>
                {ctaLabel}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <Link href={href} className="mercado-mp-card-btn" prefetch={false}>
                {ctaLabel}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </article>
    </li>
  );
});

const MercadoCardMedia = memo(function MercadoCardMedia({
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
  const src =
    product.gallery_urls?.[0] ?? product.thumb_url ?? null;

  const media = src ? (
    <CatalogProductImage
      src={src}
      alt={product.product_name}
      className="mercado-mp-card-image"
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
    />
  ) : (
    <CatalogProductMediaFallback
      alt={product.product_name}
      className="mercado-card-media-fallback"
    />
  );

  return (
    <>
      {onOpen ? (
        <button
          type="button"
          className="mercado-mp-card-media-hit"
          onClick={onOpen}
          aria-label={`Ver ${product.product_name}`}
        >
          {media}
        </button>
      ) : (
        media
      )}
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
});
