"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Package } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

interface MercadoProductGridProps {
  products: MercadoProductCard[];
}

export function MercadoProductGrid({ products }: MercadoProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mercado-mp-empty">
        <Package className="h-8 w-8 text-teal-700/70" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">
          No hay productos con estos filtros
        </p>
        <p className="mt-1 max-w-md text-sm text-zinc-500">
          Prueba otra categoría o carga productos desde el hub de proveedores
          con la cuenta Super Admin / mayorista asociado.
        </p>
      </div>
    );
  }

  return (
    <ul className="mercado-mp-grid">
      {products.map((product) => (
        <li key={product.product_id}>
          <article className="group mercado-mp-card">
            <Link
              href={`/mercado-oculto/producto/${product.product_id}`}
              className="mercado-mp-card-media"
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
                <div className="mercado-card-media-fallback" aria-hidden="true">
                  {product.product_name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="mercado-mp-badge">Mayorista Oficial Alcéntimo</span>
            </Link>

            <div className="mercado-mp-card-body">
              <p className="mercado-mp-card-meta">
                {product.category_name}
                <span aria-hidden="true"> · </span>
                Stock {product.available_stock}
              </p>
              <Link
                href={`/mercado-oculto/producto/${product.product_id}`}
                className="mercado-mp-card-title"
              >
                {product.product_name}
              </Link>
              <p className="mercado-mp-card-supplier">{product.supplier_label}</p>
              <p className="mercado-mp-card-price">
                <span className="mercado-mp-card-price-label">Mayorista</span>
                {formatUsd(product.price_usd)}
              </p>
              <div className="mercado-mp-card-actions">
                <Link
                  href={`/mercado-oculto/producto/${product.product_id}`}
                  className="mercado-mp-card-btn"
                >
                  Ver detalles
                </Link>
                <Link
                  href={`/mercado-oculto/producto/${product.product_id}#negociar`}
                  className="mercado-mp-card-btn-secondary"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Contactar
                </Link>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
