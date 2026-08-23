"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogVariantOption } from "@/lib/products/variants";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  getFashionAttributes,
  getFashionColorSwatch,
  looksLikeFashionVariants,
} from "@/lib/rubros/modules/ropa-moda";
import type { CatalogListItem } from "@/lib/database.types";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface FashionVariantPickerProps {
  product: CatalogListItem;
  variantOptions: CatalogVariantOption[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
  /** `card` = chips compactos en 2 columnas; `detail` = chips un poco más grandes. */
  density?: "card" | "detail";
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

function formatSizeChipLabel(size: string): string {
  const trimmed = size.trim();
  // En chips compactos, "EUR 40" / "US 9" ya son cortos; no añadir cm.
  return trimmed;
}

export function FashionVariantPicker({
  product,
  variantOptions,
  selectedVariantId,
  onSelect,
  density = "card",
}: FashionVariantPickerProps) {
  const formVariants = useMemo(() => toFormInputs(product), [product]);
  const isFashion = looksLikeFashionVariants(formVariants);

  const { sizes, colors, byKey, sizeLengthCm } = useMemo(() => {
    const sizeList: string[] = [];
    const colorList: string[] = [];
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    const map = new Map<string, CatalogVariantOption>();
    const cmBySize = new Map<string, string>();

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
      if (attrs.longitudCm && !cmBySize.has(attrs.talla)) {
        cmBySize.set(attrs.talla, attrs.longitudCm);
      }
      map.set(`${attrs.talla}||${attrs.color}`, option);
    }

    return {
      sizes: sizeList,
      colors: colorList,
      byKey: map,
      sizeLengthCm: cmBySize,
    };
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
    if (match) {
      if (match.id !== selectedVariantId) onSelect(match.id);
      return;
    }

    // Si la talla nueva no tiene ese color, saltar al primer color disponible.
    for (const candidate of colors) {
      const option = byKey.get(`${talla}||${candidate}`);
      if (option && option.availableStock > 0) {
        setColor(candidate);
        return;
      }
    }
    for (const candidate of colors) {
      if (byKey.has(`${talla}||${candidate}`)) {
        setColor(candidate);
        return;
      }
    }
  }, [talla, color, byKey, onSelect, selectedVariantId, colors]);

  if (!isFashion || sizes.length === 0 || colors.length === 0) {
    return (
      <select
        id={`variant-${product.product_id}`}
        value={selectedVariantId}
        onChange={(e) => onSelect(e.target.value)}
        className="store-cart-select store-product-variant-select fashion-variant-select w-full"
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
  const selectedLengthCm = sizeLengthCm.get(talla) ?? null;
  const isDetail = density === "detail";

  return (
    <div
      className={cn(
        "fashion-variant-picker",
        isDetail
          ? "fashion-variant-picker--detail"
          : "fashion-variant-picker--card",
      )}
    >
      <div className="fashion-variant-field">
        <span className="fashion-variant-label" id={`talla-label-${product.product_id}`}>
          Talla
        </span>
        <div
          className="fashion-variant-chips"
          role="listbox"
          aria-labelledby={`talla-label-${product.product_id}`}
        >
          {sizes.map((size) => {
            const selected = talla === size;
            const cm = sizeLengthCm.get(size);
            const hasAnyStock = colors.some((candidate) => {
              const option = byKey.get(`${size}||${candidate}`);
              return option != null && option.availableStock > 0;
            });
            return (
              <button
                key={size}
                type="button"
                role="option"
                aria-selected={selected}
                title={cm ? `${size} · ${cm} cm` : size}
                disabled={!hasAnyStock}
                onClick={() => setTalla(size)}
                className={cn(
                  "fashion-variant-chip",
                  selected && "fashion-variant-chip-active",
                  !hasAnyStock && "fashion-variant-chip-unavailable",
                )}
              >
                {formatSizeChipLabel(size)}
              </button>
            );
          })}
        </div>
        {selectedLengthCm ? (
          <p className="fashion-variant-hint">{selectedLengthCm} cm</p>
        ) : null}
      </div>

      <div className="fashion-variant-field">
        <span className="fashion-variant-label" id={`color-label-${product.product_id}`}>
          Color
        </span>
        <div
          className="fashion-variant-swatches"
          role="listbox"
          aria-labelledby={`color-label-${product.product_id}`}
        >
          {colors.map((item) => {
            const option = byKey.get(`${talla}||${item}`);
            const unavailable = option != null && option.availableStock <= 0;
            const missing = option == null;
            const selected = color === item;
            const swatch = getFashionColorSwatch(item);
            const isLight =
              swatch != null &&
              (item.toLowerCase() === "blanco" ||
                item.toLowerCase() === "beige");

            if (swatch) {
              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={item}
                  title={unavailable || missing ? `${item} (agotado)` : item}
                  disabled={unavailable || missing}
                  onClick={() => setColor(item)}
                  className={cn(
                    "fashion-variant-swatch",
                    selected && "fashion-variant-swatch-active",
                    (unavailable || missing) &&
                      "fashion-variant-swatch-unavailable",
                    isLight && "fashion-variant-swatch-light",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              );
            }

            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={selected}
                title={unavailable || missing ? `${item} (agotado)` : item}
                disabled={unavailable || missing}
                onClick={() => setColor(item)}
                className={cn(
                  "fashion-variant-chip",
                  selected && "fashion-variant-chip-active",
                  (unavailable || missing) && "fashion-variant-chip-unavailable",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {current && current.availableStock <= 0 ? (
        <p className="fashion-variant-stock-warn">
          Esta combinación no tiene stock.
        </p>
      ) : null}
    </div>
  );
}
