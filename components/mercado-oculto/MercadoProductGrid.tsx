"use client";

import Image from "next/image";
import Link from "next/link";
import { Package, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

interface MercadoProductGridProps {
  products: MercadoProductCard[];
}

export function MercadoProductGrid({ products }: MercadoProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mercado-mp-empty">
        <Package className="h-8 w-8 text-emerald-700/70" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-[var(--mo-ink)]">
          No encontramos productos
        </p>
        <p className="mt-1 max-w-md text-sm text-[var(--mo-muted)]">
          Probá otras palabras o quitá filtros. La vitrina Moriche se actualiza
          con nuevas curadurías mayoristas.
        </p>
      </div>
    );
  }

  return (
    <ul className="mercado-mp-grid">
      {products.map((product) => {
        const inStock = product.available_stock > 0;
        const showDiscount =
          inStock &&
          product.discount_percent != null &&
          product.compare_at_usd != null &&
          product.compare_at_usd > product.price_usd;
        const showFreeShipping = inStock && product.free_shipping;

        return (
          <li key={product.product_id}>
            <article className="group mercado-mp-card">
            <Link
              href={`/mercado-oculto/producto/${product.product_id}`}
              className="mercado-mp-card-media"
              prefetch
            >
                {product.thumb_url ? (
                  <Image
                    src={product.thumb_url}
                    alt={product.product_name}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                    unoptimized
                  />
                ) : (
                  <div
                    className="mercado-card-media-fallback"
                    aria-hidden="true"
                  >
                    {product.product_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                {showDiscount ? (
                  <span className="mercado-mp-discount-badge">
                    {product.discount_percent}% OFF
                  </span>
                ) : null}
              </Link>

              <div className="mercado-mp-card-body">
              <Link
                href={`/mercado-oculto/producto/${product.product_id}`}
                className="mercado-mp-card-title"
                prefetch
              >
                  {product.product_name}
                </Link>

                <div className="mercado-mp-card-pricing">
                  {showDiscount ? (
                    <p className="mercado-mp-card-compare">
                      {formatUsd(product.compare_at_usd)}
                    </p>
                  ) : null}
                  <p className="mercado-mp-card-price">
                    {formatUsd(product.price_usd)}
                  </p>
                </div>

                {showFreeShipping ? (
                  <p className="mercado-mp-free-ship">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    Envío gratis
                  </p>
                ) : inStock ? (
                  <p className="mercado-mp-card-meta">Envío a nivel nacional</p>
                ) : (
                  <p className="mercado-mp-card-meta">Sin stock por ahora</p>
                )}

                <p className="mercado-mp-card-supplier">
                  por {product.supplier_label}
                </p>

                <div className="mercado-mp-card-actions">
                  <Link
                    href={`/mercado-oculto/producto/${product.product_id}`}
                    className="mercado-mp-card-btn"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
