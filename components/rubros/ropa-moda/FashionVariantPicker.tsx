"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  getFashionAttributes,
  looksLikeFashionVariants,
} from "@/lib/rubros/modules/ropa-moda";
import type { CatalogListItem } from "@/lib/database.types";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatUsd } from "@/lib/format";

interface FashionVariantPickerProps {
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

export function FashionVariantPicker({
  product,
  variantOptions,
  selectedVariantId,
  onSelect,
}: FashionVariantPickerProps) {
  const formVariants = useMemo(() => toFormInputs(product), [product]);
  const isFashion = looksLikeFashionVariants(formVariants);

  const { sizes, colors, byKey } = useMemo(() => {
    const sizeList: string[] = [];
    const colorList: string[] = [];
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    const map = new Map<string, CatalogVariantOption>();

    for (const option of variantOptions) {
      const form = formVariants.find((row) => row.id === option.id);
      const attrs = form ? getFashionAttributes(form) : null;
      if (!attrs) continue;

      if (!sizeSet.has(attrs.talla)) {
        sizeSet.add(attrs.talla);
        sizeList.push(attrs.talla);
      }
      if (!colorSet.has(attrs.color)) {
        colorSet.add(attrs.color);
        colorList.push(attrs.color);
      }
      map.set(`${attrs.talla}||${attrs.color}`, option);
    }

    return { sizes: sizeList, colors: colorList, byKey: map };
  }, [formVariants, variantOptions]);

  const selectedAttrs = useMemo(() => {
    const form = formVariants.find((row) => row.id === selectedVariantId);
    return form ? getFashionAttributes(form) : null;
  }, [formVariants, selectedVariantId]);

  const [talla, setTalla] = useState(selectedAttrs?.talla ?? sizes[0] ?? "");
  const [color, setColor] = useState(selectedAttrs?.color ?? colors[0] ?? "");

  useEffect(() => {
    if (selectedAttrs?.talla) setTalla(selectedAttrs.talla);
    if (selectedAttrs?.color) setColor(selectedAttrs.color);
  }, [selectedAttrs?.talla, selectedAttrs?.color]);

  useEffect(() => {
    const match = byKey.get(`${talla}||${color}`);
    if (match && match.id !== selectedVariantId) {
      onSelect(match.id);
    }
  }, [talla, color, byKey, onSelect, selectedVariantId]);

  if (!isFashion || sizes.length === 0 || colors.length === 0) {
    return (
      <select
        id={`variant-${product.product_id}`}
        value={selectedVariantId}
        onChange={(e) => onSelect(e.target.value)}
        className="store-cart-select store-product-variant-select w-full"
        aria-label="Variante"
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
    );
  }

  const current = byKey.get(`${talla}||${color}`);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label
          htmlFor={`talla-${product.product_id}`}
          className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500"
        >
          Talla
        </label>
        <select
          id={`talla-${product.product_id}`}
          value={talla}
          onChange={(e) => setTalla(e.target.value)}
          className="store-cart-select store-product-variant-select w-full"
        >
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={`color-${product.product_id}`}
          className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500"
        >
          Color
        </label>
        <select
          id={`color-${product.product_id}`}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="store-cart-select store-product-variant-select w-full"
        >
          {colors.map((item) => {
            const option = byKey.get(`${talla}||${item}`);
            const unavailable = option != null && option.availableStock <= 0;
            return (
              <option key={item} value={item} disabled={unavailable}>
                {item}
                {unavailable ? " — Agotado" : ""}
              </option>
            );
          })}
        </select>
      </div>
      {current && current.availableStock <= 0 ? (
        <p className="col-span-2 text-[11px] text-red-600">
          Esta combinación no tiene stock.
        </p>
      ) : null}
    </div>
  );
}
