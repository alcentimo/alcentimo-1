"use client";

import Image from "next/image";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Loader2, Minus, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";
import {
  getLowStockThreshold,
  isOutOfStock,
} from "@/lib/inventory/stock-status";
import { deleteProduct, fetchInventoryProducts, adjustProductStock } from "@/lib/products/actions";
import { hasMultipleVariants } from "@/lib/products/variants";
import { ProductFormSheet } from "@/components/dashboard/ProductFormSheet";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface InventoryPanelProps {
  store: Store;
  categories: CategoryOption[];
  exchangeRate: number | null;
  initialProducts: CatalogListItem[];
  fieldLabels?: string[];
  storeCategoryLabel?: string | null;
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
    return <span className="stock-badge stock-badge-low">Stock bajo</span>;
  }

  return null;
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
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
        <Image
          src={thumbUrl}
          alt={name}
          fill
          sizes="36px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface InventoryRowProps {
  product: CatalogListItem;
  onEdit: (productId: string) => void;
  onDelete: (product: CatalogListItem) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  adjustingStock: boolean;
}

function InventoryRow({
  product,
  onEdit,
  onDelete,
  onStockAdjust,
  adjustingStock,
}: InventoryRowProps) {
  const threshold = getLowStockThreshold(product);
  const out = isOutOfStock({ available_stock: product.available_stock });
  const low = !out && product.available_stock <= threshold;
  const quickAdjustDisabled = hasMultipleVariants(product) || adjustingStock;

  return (
    <tr
      className={`inventory-row group ${low ? "inventory-row-low-stock" : ""} ${out ? "inventory-row-out-stock" : ""}`}
    >
      <td className="inventory-td w-12">
        <ProductThumb name={product.product_name} thumbUrl={product.thumb_url} />
      </td>
      <td className="inventory-td">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {product.product_name}
          </p>
          {product.category_name ? (
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {product.category_name}
            </p>
          ) : null}
        </div>
      </td>
      <td className="inventory-td">
        <div className="flex items-center gap-1">
          {!hasMultipleVariants(product) && (
            <button
              type="button"
              onClick={() => onStockAdjust(product.product_id, -1)}
              disabled={quickAdjustDisabled || product.available_stock <= 0}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label={`Restar stock de ${product.product_name}`}
            >
              <Minus className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <div className="flex min-w-[2.5rem] flex-col items-center">
            <span
              className={`text-sm font-semibold tabular-nums ${
                out
                  ? "text-zinc-400"
                  : low
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {product.available_stock}
            </span>
            <StockBadge available={product.available_stock} threshold={threshold} />
          </div>
          {!hasMultipleVariants(product) && (
            <button
              type="button"
              onClick={() => onStockAdjust(product.product_id, 1)}
              disabled={quickAdjustDisabled}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              aria-label={`Sumar stock de ${product.product_name}`}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </td>
      <td className="inventory-td">
        <div>
          <span className="price-usd-cell">{formatUsd(product.price_usd)}</span>
          {product.price_ves != null && (
            <p className="price-ves-cell mt-0.5 text-[11px]">{formatVes(product.price_ves)}</p>
          )}
        </div>
      </td>
      <td className="inventory-td inventory-td-actions">
        <DropdownMenu
          align="end"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500"
              aria-label={`Acciones para ${product.product_name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        >
          {(close) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  onEdit(product.product_id);
                }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onClick={() => {
                  close();
                  onDelete(product);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </td>
    </tr>
  );
}

export function InventoryPanel({
  store,
  categories,
  exchangeRate,
  initialProducts,
  fieldLabels = [],
  storeCategoryLabel = null,
}: InventoryPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CatalogListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [deleting, startDelete] = useTransition();

  const categoriesInList = useMemo(() => {
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

  const refreshProducts = useCallback(() => {
    startRefresh(async () => {
      const result = await fetchInventoryProducts();
      if (!result.error) {
        setProducts(result.products);
      }
    });
  }, []);

  function openCreate() {
    setSheetMode("create");
    setEditingProductId(undefined);
    setSheetOpen(true);
  }

  function openEdit(productId: string) {
    setSheetMode("edit");
    setEditingProductId(productId);
    setSheetOpen(true);
  }

  function handleStockAdjust(productId: string, delta: number) {
    setAdjustingProductId(productId);
    startRefresh(async () => {
      const result = await adjustProductStock(productId, delta);
      if (result.error) {
        setAdjustingProductId(null);
        return;
      }

      if (result.stock != null) {
        setProducts((prev) =>
          prev.map((item) =>
            item.product_id === productId
              ? {
                  ...item,
                  available_stock: result.stock!,
                  stock_quantity: result.stock!,
                }
              : item,
          ),
        );
      } else {
        const refreshed = await fetchInventoryProducts();
        if (!refreshed.error) setProducts(refreshed.products);
      }
      setAdjustingProductId(null);
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.product_id;
    const previous = products;

    setProducts((current) => current.filter((item) => item.product_id !== targetId));
    setDeleteError(null);

    startDelete(async () => {
      const result = await deleteProduct(targetId);
      if (result.error) {
        setProducts(previous);
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      refreshProducts();
    });
  }

  return (
    <>
      <div className="inventory-catalog-header">
        <div className="inventory-toolbar flex-1">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="inventory-search-input inventory-search-input-dense"
              aria-label="Buscar productos"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="inventory-filter-select inventory-filter-select-dense"
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {categoriesInList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={openCreate} className="btn-brand h-10 shrink-0 gap-2 px-5 text-sm font-semibold shadow-md">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo producto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="card-panel flex flex-col items-center border-dashed py-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Sin productos en el catálogo
          </h2>
          <p className="mt-1.5 max-w-sm text-xs text-zinc-500">
            Crea tu primer producto para empezar a vender.
          </p>
          <Button onClick={openCreate} className="btn-brand mt-5 gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="inventory-table inventory-table-dense min-w-[720px]">
              <thead>
                <tr className="bg-zinc-50/95 dark:bg-zinc-900/70">
                  <th scope="col" className="inventory-th inventory-th-dense w-12">
                    Foto
                  </th>
                  <th scope="col" className="inventory-th inventory-th-dense inventory-th-product">
                    Nombre
                  </th>
                  <th scope="col" className="inventory-th inventory-th-dense inventory-th-stock">
                    Stock
                  </th>
                  <th scope="col" className="inventory-th inventory-th-dense inventory-th-price">
                    Precio
                  </th>
                  <th scope="col" className="inventory-th inventory-th-dense inventory-th-actions">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="inventory-td inventory-td-dense py-10 text-center text-xs text-zinc-500"
                    >
                      No hay productos que coincidan con tu búsqueda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => (
                    <InventoryRow
                      key={product.product_id}
                      product={product}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onStockAdjust={handleStockAdjust}
                      adjustingStock={adjustingProductId === product.product_id}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200/70 bg-zinc-50/50 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/30">
            <span>
              {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            </span>
            {refreshing && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Actualizando…
              </span>
            )}
          </div>
        </div>
      )}

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        store={store}
        categories={categories}
        exchangeRate={exchangeRate}
        fieldLabels={fieldLabels}
        storeCategoryLabel={storeCategoryLabel}
        mode={sheetMode}
        productId={editingProductId}
        onSaved={refreshProducts}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar producto"
        description={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.product_name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />

      {deleteError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {deleteError}
        </p>
      )}
    </>
  );
}
