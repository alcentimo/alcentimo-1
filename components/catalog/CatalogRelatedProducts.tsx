"use client";

import { ProductCard } from "@/components/catalog/ProductCard";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { getStoreProductDeepLinkPath } from "@/lib/store-host";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function pickRelatedCatalogProducts(
  current: CatalogListItem,
  catalog: CatalogListItem[] | undefined,
  limit = 10,
): CatalogListItem[] {
  if (!catalog || catalog.length === 0) return [];
  const others = catalog.filter(
    (item) => item.product_id !== current.product_id,
  );
  const sameCategory = others.filter(
    (item) =>
      Boolean(current.category_slug) &&
      item.category_slug === current.category_slug,
  );
  const rest = others.filter(
    (item) => item.category_slug !== current.category_slug,
  );
  return [...sameCategory, ...rest].slice(0, limit);
}

interface CatalogRelatedProductsProps {
  products: CatalogListItem[];
  storeSlug: string;
  exchangeRate?: number | null;
  showBsConversion?: boolean;
  storeRubro?: string | null;
  wholesaleEnabled?: boolean;
  onAddToCart?: (
    product: CatalogListItem,
    variant: CatalogVariantOption,
    modifiers?: CartModifierSelection[],
  ) => void;
  className?: string;
}

export function CatalogRelatedProducts({
  products,
  storeSlug,
  exchangeRate = null,
  showBsConversion = true,
  storeRubro = null,
  wholesaleEnabled = false,
  onAddToCart,
  className,
}: CatalogRelatedProductsProps) {
  const pathname = usePathname();
  if (products.length === 0) return null;

  return (
    <section
      className={cn("product-detail-related", className)}
      aria-labelledby="product-detail-related-heading"
    >
      <h2 id="product-detail-related-heading" className="product-detail-related-title">
        Quienes vieron este producto también compraron
      </h2>
      <ul className="product-detail-related-track">
        {products.map((product) => (
          <li key={product.product_id} className="product-detail-related-item">
            <ProductCard
              product={product}
              exchangeRate={exchangeRate}
              showBsConversion={showBsConversion}
              storeRubro={storeRubro}
              wholesaleEnabled={wholesaleEnabled}
              onAddToCart={onAddToCart}
              detailHref={getStoreProductDeepLinkPath(
                storeSlug,
                product.product_slug,
                { pathname },
              )}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
