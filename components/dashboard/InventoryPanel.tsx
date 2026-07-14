"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";
import {
  getLowStockThreshold,
  isOutOfStock,
} from "@/lib/inventory/stock-status";

interface InventoryPanelProps {
  products: CatalogListItem[];
}

function StockBadge({
  available,
  threshold,
}: {
  available: number;
  threshold: number;
}) {
  if (isOutOfStock({ available_stock: available })) {
    return <span className="stock-badge stock-badge-out">Agotado</span>;
  }

  if (available <= threshold) {
    return <span className="stock-badge stock-badge-low">Bajo stock</span>;
  }

  return <span className="stock-badge stock-badge-ok">Disponible</span>;
}

function ProductThumb({
  name,
  thumbUrl,
}: {
  name: string;
  thumbUrl: string | null;
}) {
  if (thumbUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <Image
          src={thumbUrl}
          alt={name}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-200/80 bg-linear-to-br from-teal-50 to-zinc-100 text-sm font-bold text-teal-600 shadow-sm dark:border-teal-900 dark:from-teal-950 dark:to-zinc-900 dark:text-teal-400">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function InventoryRow({ product }: { product: CatalogListItem }) {
  const threshold = getLowStockThreshold(product);

  return (
    <tr className="inventory-row group">
      <td className="inventory-td w-16">
        <ProductThumb name={product.product_name} thumbUrl={product.thumb_url} />
      </td>
      <td className="inventory-td">
        <Link
          href={`/dashboard/productos/${product.product_id}/editar`}
          className="block min-w-0 transition-colors hover:text-teal-700 dark:hover:text-teal-300"
        >
          <p className="truncate font-medium text-zinc-900 group-hover:text-teal-700 dark:text-zinc-50 dark:group-hover:text-teal-300">
            {product.product_name}
          </p>
          {product.category_name ? (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {product.category_name}
            </p>
          ) : null}
        </Link>
      </td>
      <td className="inventory-td">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tabular-nums ${
              isOutOfStock({ available_stock: product.available_stock })
                ? "text-zinc-400"
                : product.available_stock <= threshold
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {product.available_stock}
          </span>
          <StockBadge available={product.available_stock} threshold={threshold} />
        </div>
      </td>
      <td className="inventory-td">
        <span className="price-usd-cell">{formatUsd(product.price_usd)}</span>
      </td>
    </tr>
  );
}

export function InventoryPanel({ products }: InventoryPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const product of products) {
      if (product.category_name) names.add(product.category_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !q ||
        product.product_name.toLowerCase().includes(q) ||
        (product.category_name?.toLowerCase().includes(q) ?? false);
      const matchesCategory =
        category === "all" || product.category_name === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  if (products.length === 0) {
    return (
      <div className="card-panel flex flex-col items-center border-dashed py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
          <Package className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sin productos en el catálogo
        </h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Publica tu primer producto para verlo listado aquí con stock y precio.
        </p>
        <Link href="/dashboard/productos/nuevo" className="btn-brand mt-6 gap-2 shadow-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo producto
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="inventory-toolbar">
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
            aria-label="Buscar productos"
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

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="inventory-table min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50/95 dark:bg-zinc-900/70">
                <th scope="col" className="inventory-th w-16">
                  Foto
                </th>
                <th scope="col" className="inventory-th inventory-th-product">
                  Nombre
                </th>
                <th scope="col" className="inventory-th inventory-th-stock">
                  Stock
                </th>
                <th scope="col" className="inventory-th inventory-th-price">
                  Precio
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="inventory-td py-12 text-center text-sm text-zinc-500">
                    No hay productos que coincidan con tu búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <InventoryRow key={product.product_id} product={product} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-zinc-200/70 bg-zinc-50/50 px-5 py-3.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
          <span>
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""} en lista
          </span>
        </div>
      </div>
    </div>
  );
}
