"use client";

import dynamic from "next/dynamic";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import { formatUsd } from "@/lib/format";

const FashionVariantPicker = dynamic(
  () =>
    import("@/components/rubros/ropa-moda/FashionVariantPicker").then(
      (mod) => mod.FashionVariantPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    ),
  },
);

interface RubroCatalogVariantSlotProps {
  rubro?: string | null;
  product: CatalogListItem;
  variantOptions: CatalogVariantOption[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
}

function DefaultVariantSelect({
  productId,
  variantOptions,
  selectedVariantId,
  onSelect,
}: {
  productId: string;
  variantOptions: CatalogVariantOption[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
}) {
  return (
    <>
      <label htmlFor={`variant-${productId}`} className="sr-only">
        Variante
      </label>
      <select
        id={`variant-${productId}`}
        value={selectedVariantId}
        onChange={(e) => onSelect(e.target.value)}
        className="store-cart-select store-product-variant-select w-full"
      >
        {variantOptions.map((variant) => (
          <option
            key={variant.id}
            value={variant.id}
            disabled={variant.availableStock <= 0}
          >
            {variant.name}
            {variant.priceExtraUsd > 0 ? ` (+${formatUsd(variant.priceExtraUsd)})` : ""}
            {variant.availableStock <= 0 ? " — Agotado" : ""}
          </option>
        ))}
      </select>
    </>
  );
}

/**
 * Selector de variantes del catálogo público.
 * Solo importa el picker de moda si el rubro de la tienda es ropa-moda.
 */
export function RubroCatalogVariantSlot({
  rubro,
  product,
  variantOptions,
  selectedVariantId,
  onSelect,
}: RubroCatalogVariantSlotProps) {
  if (getActiveProductModuleId(rubro) === "ropa-moda") {
    return (
      <FashionVariantPicker
        product={product}
        variantOptions={variantOptions}
        selectedVariantId={selectedVariantId}
        onSelect={onSelect}
      />
    );
  }

  return (
    <DefaultVariantSelect
      productId={product.product_id}
      variantOptions={variantOptions}
      selectedVariantId={selectedVariantId}
      onSelect={onSelect}
    />
  );
}
