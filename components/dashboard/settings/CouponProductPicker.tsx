"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";

export interface CouponProductOption {
  id: string;
  name: string;
  categoryName?: string | null;
  thumbUrl?: string | null;
}

interface CouponProductPickerProps {
  products: CouponProductOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CouponProductPicker({
  products,
  selectedIds,
  onChange,
}: CouponProductPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const product of products) {
      if (product.categoryName) names.add(product.categoryName);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.categoryName?.toLowerCase().includes(query) ?? false);
      const matchesCategory =
        category === "all" || product.categoryName === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  function toggleProduct(productId: string) {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId));
      return;
    }
    onChange([...selectedIds, productId]);
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="inventory-toolbar !gap-3 !p-0">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría…"
            className="inventory-search-input"
            aria-label="Buscar productos para el cupón"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="inventory-filter-select"
          aria-label="Filtrar por categoría"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-zinc-500">
        {selectedIds.length} producto{selectedIds.length !== 1 ? "s" : ""} seleccionado
        {selectedIds.length !== 1 ? "s" : ""}
      </p>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700">
          No hay productos en tu inventario. Publica productos primero.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay productos que coincidan con la búsqueda.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {filtered.map((product) => {
            const checked = selectedIds.includes(product.id);
            return (
              <li key={product.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    checked
                      ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(product.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {product.thumbUrl ? (
                      <Image
                        src={product.thumbUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-400">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {product.name}
                    </p>
                    {product.categoryName && (
                      <p className="truncate text-xs text-zinc-500">{product.categoryName}</p>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
