"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useCallback, useMemo, useState, useTransition } from "react";
import {
  Loader2,
  Download,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";
import {
  getLowStockThreshold,
  isOutOfStock,
} from "@/lib/inventory/stock-status";
import { deleteProduct, fetchInventoryProducts, adjustProductStock } from "@/lib/products/actions";
import { hasMultipleVariants } from "@/lib/products/variants";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  PRODUCT_IMPORT_TEMPLATE_FILENAME,
  PRODUCT_IMPORT_TEMPLATE_PATH,
} from "@/lib/products/import-schema";

const ProductFormSheet = dynamic(
  () =>
    import("@/components/dashboard/ProductFormSheet").then(
      (mod) => mod.ProductFormSheet,
    ),
  { ssr: false },
);

const ProductImportSheet = dynamic(
  () =>
    import("@/components/dashboard/ProductImportSheet").then(
      (mod) => mod.ProductImportSheet,
    ),
  { ssr: false },
);

interface InventoryPanelProps {
  store: Store;
  exchangeRate: number | null;
  initialProducts: CatalogListItem[];
  productFormConfig: StoreProductFormConfig;
}

const StockBadge = memo(function StockBadge({
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
});

const ProductThumb = memo(function ProductThumb({
  name,
  thumbUrl,
  size = "sm",
}: {
  name: string;
  thumbUrl: string | null;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? "h-12 w-12" : "h-9 w-9";
  const imageSizes = size === "md" ? "48px" : "36px";

  if (thumbUrl) {
    return (
      <div
        className={`relative ${dimension} shrink-0 overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800`}
      >
        <Image
          src={thumbUrl}
          alt={name}
          fill
          sizes={imageSizes}
          loading="lazy"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
});

const InventoryPriceDisplay = memo(function InventoryPriceDisplay({
  priceUsd,
  priceVes,
}: {
  priceUsd: number | null;
  priceVes: number | null;
}) {
  return (
    <div>
      <span className="price-usd-cell">
        {priceUsd != null ? formatUsd(priceUsd) : "—"}
      </span>
      {priceVes != null && (
        <p className="price-ves-cell mt-0.5 text-[11px]">{formatVes(priceVes)}</p>
      )}
    </div>
  );
});

const InventoryActionsMenu = memo(function InventoryActionsMenu({
  productName,
  productId,
  onEdit,
  onDelete,
}: {
  productName: string;
  productId: string;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
}) {
  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-zinc-500"
          aria-label={`Acciones para ${productName}`}
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
              onEdit(productId);
            }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onClick={() => {
              close();
              onDelete(productId);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Eliminar
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
});

const InventoryStockControls = memo(function InventoryStockControls({
  productName,
  productId,
  availableStock,
  threshold,
  hasVariants,
  adjustingStock,
  onStockAdjust,
  layout = "inline",
}: {
  productName: string;
  productId: string;
  availableStock: number;
  threshold: number;
  hasVariants: boolean;
  adjustingStock: boolean;
  onStockAdjust: (productId: string, delta: number) => void;
  layout?: "inline" | "spread";
}) {
  const out = isOutOfStock({ available_stock: availableStock });
  const low = !out && availableStock <= threshold;
  const quickAdjustDisabled = hasVariants || adjustingStock;
  const containerClass =
    layout === "spread"
      ? "flex items-center justify-between gap-3"
      : "flex items-center gap-1";

  return (
    <div className={containerClass}>
      {layout === "spread" && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Stock
        </span>
      )}
      <div className="flex items-center gap-1">
        {!hasVariants && (
          <button
            type="button"
            onClick={() => onStockAdjust(productId, -1)}
            disabled={quickAdjustDisabled || availableStock <= 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            aria-label={`Restar stock de ${productName}`}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <div className="flex min-w-[2.75rem] flex-col items-center">
          <span
            className={`text-sm font-semibold tabular-nums ${
              out
                ? "text-zinc-400"
                : low
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {availableStock}
          </span>
          <StockBadge available={availableStock} threshold={threshold} />
        </div>
        {!hasVariants && (
          <button
            type="button"
            onClick={() => onStockAdjust(productId, 1)}
            disabled={quickAdjustDisabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            aria-label={`Sumar stock de ${productName}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
});

const InventoryRow = memo(function InventoryRow({
  product,
  onEdit,
  onDelete,
  onStockAdjust,
  adjustingStock,
}: {
  product: CatalogListItem;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  adjustingStock: boolean;
}) {
  const threshold = getLowStockThreshold(product);
  const out = isOutOfStock({ available_stock: product.available_stock });
  const low = !out && product.available_stock <= threshold;
  const productHasVariants = hasMultipleVariants(product);

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
        <InventoryStockControls
          productName={product.product_name}
          productId={product.product_id}
          availableStock={product.available_stock}
          threshold={threshold}
          hasVariants={productHasVariants}
          adjustingStock={adjustingStock}
          onStockAdjust={onStockAdjust}
        />
      </td>
      <td className="inventory-td">
        <InventoryPriceDisplay
          priceUsd={product.price_usd}
          priceVes={product.price_ves}
        />
      </td>
      <td className="inventory-td inventory-td-actions">
        <InventoryActionsMenu
          productName={product.product_name}
          productId={product.product_id}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
});

const InventoryMobileCard = memo(function InventoryMobileCard({
  product,
  onEdit,
  onDelete,
  onStockAdjust,
  adjustingStock,
}: {
  product: CatalogListItem;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  adjustingStock: boolean;
}) {
  const threshold = getLowStockThreshold(product);
  const out = isOutOfStock({ available_stock: product.available_stock });
  const low = !out && product.available_stock <= threshold;
  const productHasVariants = hasMultipleVariants(product);

  return (
    <article
      className={`inventory-mobile-card ${low ? "inventory-mobile-card-low" : ""} ${out ? "inventory-mobile-card-out" : ""}`}
    >
      <div className="flex items-start gap-3">
        <ProductThumb
          name={product.product_name}
          thumbUrl={product.thumb_url}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {product.product_name}
              </p>
              {product.category_name ? (
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {product.category_name}
                </p>
              ) : null}
            </div>
            <InventoryActionsMenu
              productName={product.product_name}
              productId={product.product_id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
          <div className="mt-2">
            <InventoryPriceDisplay
              priceUsd={product.price_usd}
              priceVes={product.price_ves}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <InventoryStockControls
          productName={product.product_name}
          productId={product.product_id}
          availableStock={product.available_stock}
          threshold={threshold}
          hasVariants={productHasVariants}
          adjustingStock={adjustingStock}
          onStockAdjust={onStockAdjust}
          layout="spread"
        />
      </div>
    </article>
  );
});

export function InventoryPanel({
  store,
  exchangeRate,
  initialProducts,
  productFormConfig,
}: InventoryPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
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

  const productById = useMemo(() => {
    const map = new Map<string, CatalogListItem>();
    for (const product of products) {
      map.set(product.product_id, product);
    }
    return map;
  }, [products]);

  const refreshProducts = useCallback(() => {
    startRefresh(async () => {
      const result = await fetchInventoryProducts();
      if (!result.error) {
        setProducts(result.products);
      }
    });
  }, []);

  const openCreate = useCallback(() => {
    setSheetMode("create");
    setEditingProductId(undefined);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((productId: string) => {
    setSheetMode("edit");
    setEditingProductId(productId);
    setSheetOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((productId: string) => {
    const product = productById.get(productId);
    if (product) {
      setDeleteTarget(product);
    }
  }, [productById]);

  const handleStockAdjust = useCallback((productId: string, delta: number) => {
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
  }, []);

  const handleDeleteConfirm = useCallback(() => {
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
  }, [deleteTarget, products, refreshProducts]);

  const inventoryList = useMemo(() => {
    if (filtered.length === 0) {
      return (
        <p className="py-10 text-center text-xs text-zinc-500">
          No hay productos que coincidan con tu búsqueda.
        </p>
      );
    }

    return filtered.map((product) => {
      const isAdjusting = adjustingProductId === product.product_id;
      return (
        <InventoryMobileCard
          key={product.product_id}
          product={product}
          onEdit={openEdit}
          onDelete={handleDeleteRequest}
          onStockAdjust={handleStockAdjust}
          adjustingStock={isAdjusting}
        />
      );
    });
  }, [
    filtered,
    adjustingProductId,
    openEdit,
    handleDeleteRequest,
    handleStockAdjust,
  ]);

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

        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={PRODUCT_IMPORT_TEMPLATE_PATH}
            download={PRODUCT_IMPORT_TEMPLATE_FILENAME}
            aria-label="Descargar plantilla de importación"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 sm:px-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Descargar Plantilla</span>
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={() => setImportSheetOpen(true)}
            aria-label="Importar productos"
            className="h-10 gap-2 px-3 text-sm font-semibold sm:px-4"
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            onClick={openCreate}
            className="btn-brand h-10 shrink-0 gap-2 px-4 text-sm font-semibold shadow-md sm:px-5"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">Nuevo producto</span>
          </Button>
        </div>
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
          <div className="inventory-mobile-list" aria-label="Lista de productos">
            {inventoryList}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="inventory-table inventory-table-dense w-full">
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
                      onDelete={handleDeleteRequest}
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

      <ProductImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        onImported={refreshProducts}
      />

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        store={store}
        exchangeRate={exchangeRate}
        productFormConfig={productFormConfig}
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
