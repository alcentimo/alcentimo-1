"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  Copy,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";
import {
  getLowStockThreshold,
  isOutOfStock,
} from "@/lib/inventory/stock-status";
import {
  deleteProduct,
  duplicateProduct,
  updateProductPriceUsd,
  updateProductStock,
} from "@/lib/products/actions";

interface InventoryPanelProps {
  products: CatalogListItem[];
  exchangeRate: number | null;
}

type SavingField = "stock" | "price" | null;

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

function StockCell({
  available,
  threshold,
}: {
  available: number;
  threshold: number;
}) {
  const out = isOutOfStock({ available_stock: available });
  const low = !out && available <= threshold;

  return (
    <div className="flex items-center gap-2">
      {low && (
        <AlertCircle
          className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-label="Stock bajo"
        />
      )}
      <span
        className={`text-sm font-semibold tabular-nums ${
          out
            ? "text-zinc-400"
            : low
              ? "text-amber-700 dark:text-amber-400"
              : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {available}
      </span>
      <StockBadge available={available} threshold={threshold} />
    </div>
  );
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

function SavingHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      Guardando…
    </span>
  );
}

function ProductRowActions({
  productId,
  productName,
  onEdit,
  onQuickEdit,
}: {
  productId: string;
  productName: string;
  onEdit: () => void;
  onQuickEdit: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar "${productName}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    runAction(() => deleteProduct(productId));
  }

  function handleDuplicate() {
    runAction(() => duplicateProduct(productId));
  }

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Acciones
        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onQuickEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-4 w-4 text-zinc-500" />
              Ajuste rápido
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Pencil className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Editar producto
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDuplicate}
              disabled={pending}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Copy className="h-4 w-4 text-zinc-500" />
              {pending ? "Duplicando…" : "Duplicar producto"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              disabled={pending}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="mt-1 max-w-[10rem] text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function InventoryRow({
  product,
  exchangeRate,
}: {
  product: CatalogListItem;
  exchangeRate: number | null;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [stock, setStock] = useState(String(product.available_stock));
  const [priceUsd, setPriceUsd] = useState(
    product.price_usd != null ? String(product.price_usd) : "",
  );
  const [savingField, setSavingField] = useState<SavingField>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const vesPreview = useMemo(() => {
    const usd = parseFloat(priceUsd);
    if (!exchangeRate || !Number.isFinite(usd) || usd < 0) return null;
    return usd * exchangeRate;
  }, [priceUsd, exchangeRate]);

  function saveStock() {
    const parsed = parseInt(stock, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setRowError("Stock inválido.");
      setStock(String(product.available_stock));
      return;
    }
    if (parsed === product.available_stock) return;

    setRowError(null);
    setSavingField("stock");
    startTransition(async () => {
      const result = await updateProductStock(
        product.product_id,
        product.default_variant_id,
        parsed,
      );
      setSavingField(null);
      if (result.error) {
        setRowError(result.error);
        setStock(String(product.available_stock));
        return;
      }
      router.refresh();
    });
  }

  function savePrice() {
    const parsed = parseFloat(priceUsd);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setRowError("Precio inválido.");
      setPriceUsd(product.price_usd != null ? String(product.price_usd) : "");
      return;
    }
    if (parsed === product.price_usd) return;

    setRowError(null);
    setSavingField("price");
    startTransition(async () => {
      const result = await updateProductPriceUsd(
        product.product_id,
        product.default_variant_id,
        parsed,
      );
      setSavingField(null);
      if (result.error) {
        setRowError(result.error);
        setPriceUsd(product.price_usd != null ? String(product.price_usd) : "");
        return;
      }
      router.refresh();
    });
  }

  const displayStock = editMode ? parseInt(stock, 10) || 0 : product.available_stock;

  return (
    <tr className="inventory-row group">
      <td className="inventory-td">
        <div className="flex items-center gap-3">
          <ProductThumb name={product.product_name} thumbUrl={product.thumb_url} />
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {product.product_name}
            </p>
            {product.category_name && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {product.category_name}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="inventory-td">
        {editMode ? (
          <div>
            <input
              type="number"
              min={0}
              step={1}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              onBlur={saveStock}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="inventory-inline-input w-24"
              aria-label={`Stock de ${product.product_name}`}
            />
            <SavingHint visible={savingField === "stock"} />
          </div>
        ) : (
          <StockCell
            available={displayStock}
            threshold={getLowStockThreshold(product)}
          />
        )}
      </td>

      <td className="inventory-td">
        {editMode ? (
          <div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              onBlur={savePrice}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="inventory-inline-input w-28"
              aria-label={`Precio USD de ${product.product_name}`}
            />
            <SavingHint visible={savingField === "price"} />
          </div>
        ) : (
          <span className="price-usd-cell">
            {formatUsd(product.price_usd)}
          </span>
        )}
      </td>

      <td className="inventory-td">
        <span className="price-ves-cell">
          {editMode && vesPreview != null
            ? formatVes(vesPreview)
            : formatVes(product.price_ves)}
        </span>
      </td>

      <td className="inventory-td inventory-td-actions">
        <ProductRowActions
          productId={product.product_id}
          productName={product.product_name}
          onEdit={() => router.push(`/dashboard/productos/${product.product_id}/editar`)}
          onQuickEdit={() => setEditMode(true)}
        />
        {rowError && (
          <p className="mt-1 text-right text-xs text-red-600 dark:text-red-400">
            {rowError}
          </p>
        )}
      </td>
    </tr>
  );
}

export function InventoryPanel({ products, exchangeRate }: InventoryPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      if (p.category_name) names.add(p.category_name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.product_name.toLowerCase().includes(q) ||
        (p.category_name?.toLowerCase().includes(q) ?? false);
      const matchesCategory =
        category === "all" || p.category_name === category;
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
          Sin productos en inventario
        </h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Publica tu primer producto para verlo listado aquí con stock y precios.
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
          <table className="inventory-table min-w-[820px]">
            <thead>
              <tr className="bg-zinc-50/95 dark:bg-zinc-900/70">
                <th scope="col" className="inventory-th inventory-th-product">
                  Producto
                </th>
                <th scope="col" className="inventory-th inventory-th-stock">
                  Stock
                </th>
                <th scope="col" className="inventory-th inventory-th-price">
                  Precio USD
                </th>
                <th scope="col" className="inventory-th inventory-th-price">
                  Precio Bs
                </th>
                <th scope="col" className="inventory-th inventory-th-actions">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="inventory-td py-12 text-center text-sm text-zinc-500">
                    No hay productos que coincidan con tu búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <InventoryRow
                    key={product.product_id}
                    product={product}
                    exchangeRate={exchangeRate}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 border-t border-zinc-200/70 bg-zinc-50/50 px-5 py-3.5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
          <span>
            Mostrando {filtered.length} de {products.length} producto
            {products.length !== 1 ? "s" : ""}
          </span>
          {exchangeRate != null && (
            <span>
              Precios en Bs con tasa Bs. {formatExchangeRate(exchangeRate)} / USD
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
