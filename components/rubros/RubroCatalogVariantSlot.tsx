"use client";

import dynamic from "next/dynamic";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
} from "@/lib/rubros/modules/alimentos";
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

const FoodVariantPicker = dynamic(
  () =>
    import("@/components/rubros/alimentos/FoodVariantPicker").then(
      (mod) => mod.FoodVariantPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    ),
  },
);

const FoodModifiersPicker = dynamic(
  () =>
    import("@/components/rubros/alimentos/FoodModifiersPicker").then(
      (mod) => mod.FoodModifiersPicker,
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
  selectedModifiers?: CartModifierSelection[];
  onModifiersChange?: (next: CartModifierSelection[]) => void;
  showVariants?: boolean;
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
 * Solo importa pickers de rubro cuando el módulo está activo.
 */
export function RubroCatalogVariantSlot({
  rubro,
  product,
  variantOptions,
  selectedVariantId,
  onSelect,
  selectedModifiers = [],
  onModifiersChange,
  showVariants = true,
}: RubroCatalogVariantSlotProps) {
  const moduleId = getActiveProductModuleId(rubro);
  const foodConfig = parseFoodModifiersFromMetadata(product.metadata ?? null);
  const showFoodModifiers =
    moduleId === "alimentos" &&
    hasFoodModifiers(foodConfig) &&
    typeof onModifiersChange === "function";

  return (
    <div className="space-y-2.5">
      {showVariants ? (
        moduleId === "ropa-moda" ? (
          <FashionVariantPicker
            product={product}
            variantOptions={variantOptions}
            selectedVariantId={selectedVariantId}
            onSelect={onSelect}
          />
        ) : moduleId === "alimentos" ? (
          <FoodVariantPicker
            product={product}
            variantOptions={variantOptions}
            selectedVariantId={selectedVariantId}
            onSelect={onSelect}
          />
        ) : (
          <DefaultVariantSelect
            productId={product.product_id}
            variantOptions={variantOptions}
            selectedVariantId={selectedVariantId}
            onSelect={onSelect}
          />
        )
      ) : null}

      {showFoodModifiers ? (
        <FoodModifiersPicker
          product={product}
          selected={selectedModifiers}
          onChange={onModifiersChange}
        />
      ) : null}
    </div>
  );
}
