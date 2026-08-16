"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";
import { cn } from "@/lib/cn";

interface MercadoProductGridProps {
  products: MercadoProductCard[];
}

export function MercadoProductGrid({ products }: MercadoProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mercado-mp-empty">
        <Package className="h-8 w-8 text-emerald-800/60" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-[var(--mo-ink)]">
          Nada en esta curaduría
        </p>
        <p className="mt-1 max-w-md text-sm text-[var(--mo-muted)]">
          Probá otra colección o limpiá la búsqueda. La vitrina se actualiza con
          nuevos mayoristas.
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
                    className="object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
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
                <div className="mercado-mp-card-status-row">
                  {showDiscount ? (
                    <span className="mercado-mp-status mercado-mp-status-promo">
                      −{product.discount_percent}%
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "mercado-mp-status",
                      inStock
                        ? "mercado-mp-status-stock"
                        : "mercado-mp-status-out",
                    )}
                  >
                    {inStock ? "Disponible" : "Sin stock"}
                  </span>
                </div>
              </Link>

              <div className="mercado-mp-card-body">
                <p className="mercado-mp-card-supplier">
                  {product.supplier_label}
                </p>
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
                    <span className="mercado-mp-card-price-label">Mayorista</span>
                    {formatUsd(product.price_usd)}
                  </p>
                </div>

                {showFreeShipping ? (
                  <p className="mercado-mp-free-ship">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    Envío incluido
                  </p>
                ) : (
                  <p className="mercado-mp-card-meta">
                    {inStock ? "Listo para tu catálogo" : "Reposición pendiente"}
                  </p>
                )}

                <div className="mercado-mp-card-actions">
                  <Link
                    href={`/mercado-oculto/producto/${product.product_id}`}
                    className="mercado-mp-card-btn"
                  >
                    Ver ficha
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
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
