"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  getPortionAttribute,
  looksLikeFoodPortionVariants,
} from "@/lib/rubros/modules/alimentos";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatUsd } from "@/lib/format";

interface FoodVariantPickerProps {
  product: CatalogListItem;
  variantOptions: CatalogVariantOption[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
}

function toFormInputs(product: CatalogListItem): VariantFormInput[] {
  return parseVariantsJson(product.product_variants).map((variant) => ({
    id: variant.id,
    name: variant.name,
    priceExtraUsd: String(variant.price_extra_usd),
    stock: String(variant.stock),
    attributes: variant.attributes,
  }));
}

export function FoodVariantPicker({
  product,
  variantOptions,
  selectedVariantId,
  onSelect,
}: FoodVariantPickerProps) {
  const formVariants = useMemo(() => toFormInputs(product), [product]);
  const isFoodPortions = looksLikeFoodPortionVariants(formVariants);

  if (!isFoodPortions) {
    return (
      <>
        <label htmlFor={`food-variant-${product.product_id}`} className="sr-only">
          Porción
        </label>
        <select
          id={`food-variant-${product.product_id}`}
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
              {variant.priceExtraUsd > 0
                ? ` (+${formatUsd(variant.priceExtraUsd)})`
                : ""}
              {variant.availableStock <= 0 ? " — Agotado" : ""}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-fg-meta)]">
        Porción
      </p>
      <label htmlFor={`food-portion-${product.product_id}`} className="sr-only">
        Porción
      </label>
      <select
        id={`food-portion-${product.product_id}`}
        value={selectedVariantId}
        onChange={(e) => onSelect(e.target.value)}
        className="store-cart-select store-product-variant-select w-full"
      >
        {variantOptions.map((variant) => {
          const form = formVariants.find((row) => row.id === variant.id);
          const label = form
            ? (getPortionAttribute(form) ?? variant.name)
            : variant.name;
          return (
            <option
              key={variant.id}
              value={variant.id}
              disabled={variant.availableStock <= 0}
            >
              {label}
              {variant.priceExtraUsd > 0
                ? ` (+${formatUsd(variant.priceExtraUsd)})`
                : ""}
              {variant.availableStock <= 0 ? " — Agotado" : ""}
            </option>
          );
        })}
      </select>
    </div>
  );
}
