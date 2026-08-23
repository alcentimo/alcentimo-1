"use client";

import { useEffect, useMemo, useState } from "react";
import { getFashionColorSwatch } from "@/lib/rubros/modules/ropa-moda";
import type { SupplierFashionCatalogSku } from "@/lib/supplier/variants";
import { cn } from "@/lib/cn";

interface MercadoFashionVariantPickerProps {
  productId: string;
  skus: SupplierFashionCatalogSku[];
  selectedId: string;
  onSelect: (sku: SupplierFashionCatalogSku) => void;
}

export function MercadoFashionVariantPicker({
  productId,
  skus,
  selectedId,
  onSelect,
}: MercadoFashionVariantPickerProps) {
  const sizes = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const sku of skus) {
      if (seen.has(sku.talla)) continue;
      seen.add(sku.talla);
      list.push(sku.talla);
    }
    return list;
  }, [skus]);

  const colors = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const sku of skus) {
      if (seen.has(sku.color)) continue;
      seen.add(sku.color);
      list.push(sku.color);
    }
    return list;
  }, [skus]);

  const byKey = useMemo(() => {
    const map = new Map<string, SupplierFashionCatalogSku>();
    for (const sku of skus) {
      map.set(`${sku.talla}||${sku.color}`, sku);
    }
    return map;
  }, [skus]);

  const selected = skus.find((sku) => sku.id === selectedId) ?? skus[0];
  const [talla, setTalla] = useState(selected?.talla ?? sizes[0] ?? "");
  const [color, setColor] = useState(selected?.color ?? colors[0] ?? "");

  useEffect(() => {
    if (selected?.talla) setTalla(selected.talla);
    if (selected?.color) setColor(selected.color);
  }, [selected?.talla, selected?.color]);

  useEffect(() => {
    const match = byKey.get(`${talla}||${color}`);
    if (match) {
      if (match.id !== selectedId) onSelect(match);
      return;
    }
    for (const candidate of colors) {
      const option = byKey.get(`${talla}||${candidate}`);
      if (option && option.stock > 0) {
        setColor(candidate);
        return;
      }
    }
  }, [talla, color, byKey, colors, onSelect, selectedId]);

  if (sizes.length === 0 || colors.length === 0) return null;

  return (
    <div className="fashion-variant-picker fashion-variant-picker--detail mercado-fashion-picker">
      <div className="fashion-variant-field">
        <span className="fashion-variant-label" id={`mo-talla-${productId}`}>
          Talla
        </span>
        <div
          className="fashion-variant-chips"
          role="listbox"
          aria-labelledby={`mo-talla-${productId}`}
        >
          {sizes.map((size) => {
            const hasStock = colors.some((candidate) => {
              const option = byKey.get(`${size}||${candidate}`);
              return option != null && option.stock > 0;
            });
            const isSelected = talla === size;
            return (
              <button
                key={size}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={!hasStock}
                onClick={() => setTalla(size)}
                className={cn(
                  "fashion-variant-chip",
                  isSelected && "fashion-variant-chip-active",
                  !hasStock && "fashion-variant-chip-unavailable",
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fashion-variant-field">
        <span className="fashion-variant-label" id={`mo-color-${productId}`}>
          Color
        </span>
        <div
          className="fashion-variant-swatches"
          role="listbox"
          aria-labelledby={`mo-color-${productId}`}
        >
          {colors.map((item) => {
            const option = byKey.get(`${talla}||${item}`);
            const unavailable = !option || option.stock <= 0;
            const isSelected = color === item;
            const swatch = getFashionColorSwatch(item);
            const isLight =
              item.toLowerCase() === "blanco" || item.toLowerCase() === "beige";

            if (swatch) {
              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={item}
                  title={unavailable ? `${item} (agotado)` : item}
                  disabled={unavailable}
                  onClick={() => setColor(item)}
                  className={cn(
                    "fashion-variant-swatch",
                    isSelected && "fashion-variant-swatch-active",
                    unavailable && "fashion-variant-swatch-unavailable",
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
                aria-selected={isSelected}
                title={unavailable ? `${item} (agotado)` : item}
                disabled={unavailable}
                onClick={() => setColor(item)}
                className={cn(
                  "fashion-variant-chip",
                  isSelected && "fashion-variant-chip-active",
                  unavailable && "fashion-variant-chip-unavailable",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
