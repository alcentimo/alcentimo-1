"use client";

import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";
import { CatalogProductImage } from "@/components/catalog/CatalogProductImage";
import { CatalogProductMediaFallback } from "@/components/catalog/CatalogProductMediaFallback";

interface CatalogRelatedProductsProps {
  products: CatalogListItem[];
  onSelect: (product: CatalogListItem) => void;
}

export function CatalogRelatedProducts({
  products,
  onSelect,
}: CatalogRelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="product-detail-related" aria-labelledby="product-detail-related-title">
      <h2 id="product-detail-related-title" className="product-detail-related-title">
        Quienes vieron este producto también compraron
      </h2>
      <div className="product-detail-related-track">
        {products.map((item) => (
          <button
            key={item.product_id}
            type="button"
            className="product-detail-related-card"
            onClick={() => onSelect(item)}
          >
            <span className="product-detail-related-media">
              {item.thumb_url ? (
                <CatalogProductImage
                  src={item.thumb_url}
                  alt=""
                  className="product-detail-related-image"
                  loading="lazy"
                  sizes="160px"
                />
              ) : (
                <CatalogProductMediaFallback
                  alt=""
                  className="product-detail-related-fallback"
                />
              )}
            </span>
            <span className="product-detail-related-name">{item.product_name}</span>
            {item.price_usd != null ? (
              <span className="product-detail-related-price">
                {formatUsd(item.price_usd)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
