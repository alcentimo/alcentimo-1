"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";

export interface ProductSaleOption {
  productId: string;
  variantId: string;
  name: string;
  categoryName: string | null;
  thumbUrl: string | null;
  priceUsd: number | null;
  priceVes: number | null;
  availableStock: number;
}

interface ProductSalePickerProps {
  products: CatalogListItem[];
  selected: ProductSaleOption | null;
  onSelect: (product: ProductSaleOption | null) => void;
}

function toSaleOption(product: CatalogListItem): ProductSaleOption {
  return {
    productId: product.product_id,
    variantId: product.default_variant_id,
    name: product.product_name,
    categoryName: product.category_name,
    thumbUrl: product.thumb_url,
    priceUsd: product.price_usd,
    priceVes: product.price_ves,
    availableStock: product.available_stock,
  };
}

export function ProductSalePicker({
  products,
  selected,
  onSelect,
}: ProductSalePickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(query) ||
        product.category_name.toLowerCase().includes(query) ||
        product.default_sku.toLowerCase().includes(query),
    );
  }, [products, search]);

  return (
    <div className="space-y-3">
      <label className="label-field" htmlFor="sale-product-search">
        Producto del inventario
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          id="sale-product-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, categoría o SKU…"
          className="input-field !mt-0 pl-10"
        />
      </div>

      {selected && (
        <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900/50 dark:bg-teal-950/20">
          {selected.thumbUrl ? (
            <Image
              src={selected.thumbUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-200 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
              —
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
              {selected.name}
            </p>
            <p className="text-xs text-zinc-500">
              {selected.categoryName ?? "Sin categoría"} · Stock:{" "}
              {selected.availableStock}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
          >
            Cambiar
          </button>
        </div>
      )}

      {!selected && (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-200/80 p-2 dark:border-zinc-800">
          {products.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-500">
              No hay productos en tu inventario.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-500">
              No hay productos que coincidan con la búsqueda.
            </p>
          ) : (
            filtered.map((product) => {
              const option = toSaleOption(product);
              const outOfStock = option.availableStock <= 0;

              return (
                <button
                  key={product.product_id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => onSelect(option)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    outOfStock
                      ? "cursor-not-allowed border-zinc-100 opacity-50 dark:border-zinc-900"
                      : "border-transparent hover:border-teal-200 hover:bg-teal-50/50 dark:hover:border-teal-900/40 dark:hover:bg-teal-950/20"
                  }`}
                >
                  {option.thumbUrl ? (
                    <Image
                      src={option.thumbUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-semibold text-zinc-400 dark:bg-zinc-800">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {option.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatUsd(option.priceUsd)}
                      {option.priceVes != null && ` · ${formatVes(option.priceVes)}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {outOfStock ? "Sin stock" : `${option.availableStock} u.`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
