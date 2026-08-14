"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { MercadoProductCard } from "@/lib/mercado-oculto/types";

interface MercadoProductGridProps {
  products: MercadoProductCard[];
}

export function MercadoProductGrid({ products }: MercadoProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="mercado-empty">
        Aún no hay productos de dropshipping en la vitrina. Cuando un
        suscriptor integre productos de los mayoristas oficiales, aparecerán
        aquí para revisión del Super Admin.
      </p>
    );
  }

  return (
    <ul className="mercado-grid">
      {products.map((product) => (
        <li key={product.product_id}>
          <Link
            href={`/mercado-oculto/producto/${product.product_id}`}
            className="mercado-card"
          >
            <div className="mercado-card-media">
              {product.thumb_url ? (
                <Image
                  src={product.thumb_url}
                  alt={product.product_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 220px"
                  unoptimized
                />
              ) : (
                <div className="mercado-card-media-fallback" aria-hidden="true">
                  {product.product_name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mercado-card-body">
              <p className="mercado-card-store">{product.store_name}</p>
              <h2 className="mercado-card-title">{product.product_name}</h2>
              {product.category_name ? (
                <p className="mercado-card-meta">{product.category_name}</p>
              ) : null}
              <div className="mercado-card-footer">
                <span className="mercado-card-price">
                  {formatUsd(product.price_usd)}
                </span>
                <span className="mercado-card-cta">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Negociar
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
