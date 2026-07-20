"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Loader2,
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Table,
  Trash2,
  Upload,
  ExternalLink,
  X,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";
import {
  CRITICAL_STOCK_THRESHOLD,
  getProductStockQuantity,
  isCriticalStock,
  isOutOfStock,
  matchesCriticalStockFilter,
  type CatalogStockFilter,
} from "@/lib/inventory/stock-status";
import { deleteProduct, fetchInventoryProducts, adjustProductStock } from "@/lib/products/actions";
import { hasMultipleVariants } from "@/lib/products/variants";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CatalogPdfPreviewDialog } from "@/components/dashboard/CatalogPdfPreviewDialog";
import {
  CatalogPreviewDrawer,
  CatalogPreviewTrigger,
} from "@/components/dashboard/CatalogPreviewDrawer";

import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import { shouldShowProductLimitBanner } from "@/src/config/plans";
import { ProductLimitBanner } from "@/components/dashboard/ProductLimitBanner";
import { TrialLimitDialog } from "@/components/dashboard/plans/TrialLimitDialog";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import {
  PRODUCT_IMPORT_TEMPLATE_FILENAME,
  PRODUCT_IMPORT_TEMPLATE_PATH,
} from "@/lib/products/import-schema";
import {
  exportProductsToCsv,
  exportProductsToExcel,
  exportProductsToPdf,
  getCatalogPdfSourceData,
} from "@/lib/products/export-actions";
import type { PublishedProductResult } from "@/components/dashboard/QuickProductForm";
import {
  createPdfPreviewUrl,
  downloadCsvFile,
  downloadExcelFile,
  revokePdfPreviewUrl,
} from "@/lib/products/download-export";
import { compressCatalogImagesForPdf } from "@/lib/products/pdf-client-images";

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
  exchangeRateUpdatedAt?: string | null;
  initialProducts: CatalogListItem[];
  productFormConfig: StoreProductFormConfig;
  previewSettings: CatalogPreviewSettings;
  autoOpenCreate?: boolean;
  onAutoOpenCreateHandled?: () => void;
  stockFilter?: CatalogStockFilter;
  onStockFilterChange?: (filter: CatalogStockFilter) => void;
  productLimitContext?: StoreProductLimitContext | null;
}

const StockBadge = memo(function StockBadge({
  stockQuantity,
}: {
  stockQuantity: number;
}) {
  if (stockQuantity <= 0) {
    return <span className="stock-badge stock-badge-out">Agotado</span>;
  }

  if (stockQuantity <= CRITICAL_STOCK_THRESHOLD) {
    return <span className="stock-badge stock-badge-critical">Stock bajo</span>;
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
    <div className="inventory-price-stack">
      <span className="price-usd-cell">
        {priceUsd != null ? formatUsd(priceUsd) : "—"}
      </span>
      {priceVes != null ? (
        <p className="price-ves-cell">{formatVes(priceVes)}</p>
      ) : null}
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
    <div className="inventory-actions-group">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label={`Editar ${productName}`}
        onClick={() => onEdit(productId)}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>
      <DropdownMenu
        align="end"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-zinc-500"
            aria-label={`Más acciones para ${productName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        {(close) => (
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
        )}
      </DropdownMenu>
    </div>
  );
});

const InventoryStockControls = memo(function InventoryStockControls({
  productName,
  productId,
  availableStock,
  stockQuantity,
  hasVariants,
  adjustingStock,
  onStockAdjust,
  layout = "inline",
}: {
  productName: string;
  productId: string;
  availableStock: number;
  stockQuantity: number;
  hasVariants: boolean;
  adjustingStock: boolean;
  onStockAdjust: (productId: string, delta: number) => void;
  layout?: "inline" | "spread";
}) {
  const out = isOutOfStock({
    available_stock: availableStock,
    stock_quantity: stockQuantity,
  });
  const critical = isCriticalStock({ stock_quantity: stockQuantity });
  const quickAdjustDisabled = hasVariants || adjustingStock;
  const containerClass =
    layout === "spread"
      ? "flex flex-col gap-2"
      : "flex flex-col gap-2";

  return (
    <div className={containerClass}>
      <div
        className={
          layout === "spread"
            ? "flex items-center justify-between gap-3"
            : "flex items-center gap-1"
        }
      >
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
                  : critical
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {stockQuantity}
            </span>
            <StockBadge stockQuantity={stockQuantity} />
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
  const stockQuantity = getProductStockQuantity(product);
  const out = isOutOfStock({
    available_stock: product.available_stock,
    stock_quantity: stockQuantity,
  });
  const critical = matchesCriticalStockFilter(product);
  const productHasVariants = hasMultipleVariants(product);

  return (
    <tr
      className={`inventory-row group ${critical ? "inventory-row-low-stock" : ""} ${out ? "inventory-row-out-stock" : ""}`}
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
          stockQuantity={stockQuantity}
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
  const stockQuantity = getProductStockQuantity(product);
  const out = isOutOfStock({
    available_stock: product.available_stock,
    stock_quantity: stockQuantity,
  });
  const critical = matchesCriticalStockFilter(product);
  const productHasVariants = hasMultipleVariants(product);

  return (
    <article
      className={`inventory-mobile-card ${critical ? "inventory-mobile-card-low" : ""} ${out ? "inventory-mobile-card-out" : ""}`}
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
          stockQuantity={stockQuantity}
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
  exchangeRateUpdatedAt,
  initialProducts,
  productFormConfig,
  previewSettings,
  autoOpenCreate = false,
  onAutoOpenCreateHandled,
  stockFilter = "all",
  onStockFilterChange,
  productLimitContext = null,
}: InventoryPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
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
  const [exporting, startExport] = useTransition();
  const [exportingPdf, startExportPdf] = useTransition();
  const [exportingCsv, startExportCsv] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewBase64, setPdfPreviewBase64] = useState<string | null>(null);
  const [pdfPreviewFileName, setPdfPreviewFileName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishedProduct, setPublishedProduct] = useState<PublishedProductResult | null>(
    null,
  );

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
      const matchesStock =
        stockFilter === "all" || matchesCriticalStockFilter(product);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockFilter]);

  const criticalStockCount = useMemo(
    () => products.filter(matchesCriticalStockFilter).length,
    [products],
  );

  const productById = useMemo(() => {
    const map = new Map<string, CatalogListItem>();
    for (const product of products) {
      map.set(product.product_id, product);
    }
    return map;
  }, [products]);

  const applyInventoryRefresh = useCallback(
    (result: Awaited<ReturnType<typeof fetchInventoryProducts>>) => {
      if (result.error) {
        setRefreshError(result.error);
        return false;
      }
      setRefreshError(null);
      setProducts(result.products);
      return true;
    },
    [],
  );

  const refreshProducts = useCallback(() => {
    startRefresh(async () => {
      const result = await fetchInventoryProducts();
      applyInventoryRefresh(result);
    });
  }, [applyInventoryRefresh]);

  const handleProductSaved = useCallback(
    (result?: PublishedProductResult) => {
      refreshProducts();
      if (result) {
        setPublishedProduct(result);
      }
    },
    [refreshProducts],
  );

  const openCreate = useCallback(() => {
    if (productLimitContext?.hasReachedLimit) {
      setTrialDialogOpen(true);
      return;
    }
    setSheetMode("create");
    setEditingProductId(undefined);
    setSheetOpen(true);
  }, [productLimitContext?.hasReachedLimit]);

  useEffect(() => {
    if (!autoOpenCreate) return;
    if (productLimitContext?.hasReachedLimit) {
      setTrialDialogOpen(true);
      onAutoOpenCreateHandled?.();
      return;
    }
    openCreate();
    onAutoOpenCreateHandled?.();
  }, [autoOpenCreate, openCreate, onAutoOpenCreateHandled, productLimitContext?.hasReachedLimit]);

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
        applyInventoryRefresh(refreshed);
      }
      setAdjustingProductId(null);
    });
  }, [applyInventoryRefresh]);

  const handleExportExcel = useCallback(() => {
    startExport(async () => {
      setExportError(null);
      const result = await exportProductsToExcel();

      if (!result.ok || !result.fileBase64 || !result.fileName) {
        setExportError(result.error ?? "No se pudo exportar el catálogo.");
        return;
      }

      downloadExcelFile(result.fileBase64, result.fileName);
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    startExportCsv(async () => {
      setExportError(null);
      const result = await exportProductsToCsv();

      if (!result.ok || !result.fileBase64 || !result.fileName) {
        setExportError(result.error ?? "No se pudo exportar el catálogo en CSV.");
        return;
      }

      downloadCsvFile(result.fileBase64, result.fileName);
    });
  }, []);

  const handleExportPdf = useCallback(() => {
    startExportPdf(async () => {
      setExportError(null);

      const source = await getCatalogPdfSourceData();
      if (!source.ok || !source.products) {
        setExportError(source.error ?? "No se pudo cargar el catálogo.");
        return;
      }

      const clientImages = await compressCatalogImagesForPdf(source.products);
      const result = await exportProductsToPdf(clientImages);

      if (!result.ok || !result.fileBase64 || !result.fileName) {
        setExportError(result.error ?? "No se pudo generar el catálogo en PDF.");
        return;
      }

      setPdfPreviewUrl((current) => {
        revokePdfPreviewUrl(current);
        return createPdfPreviewUrl(result.fileBase64!);
      });
      setPdfPreviewBase64(result.fileBase64);
      setPdfPreviewFileName(result.fileName);
      setPdfPreviewOpen(true);
    });
  }, []);

  const handlePdfPreviewOpenChange = useCallback((open: boolean) => {
    setPdfPreviewOpen(open);
    if (!open) {
      setPdfPreviewUrl((current) => {
        revokePdfPreviewUrl(current);
        return null;
      });
      setPdfPreviewBase64(null);
      setPdfPreviewFileName(null);
    }
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
          {stockFilter === "critical"
            ? "No hay productos con stock crítico en este momento."
            : "No hay productos que coincidan con tu búsqueda."}
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
      {productLimitContext &&
      shouldShowProductLimitBanner(productLimitContext) ? (
        <ProductLimitBanner
          productLimit={productLimitContext}
          trial={productLimitContext.trial}
        />
      ) : null}

      {publishedProduct && (
        <div
          className="alert-success mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm">
            <strong>{publishedProduct.productName}</strong> ya está en tu catálogo
            público.{" "}
            <span className="text-teal-800/80 dark:text-teal-200/80">
              ¿Quieres ver cómo se ve?
            </span>
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={publishedProduct.catalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Ver en mi catálogo
            </a>
            <button
              type="button"
              onClick={() => setPublishedProduct(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-teal-800/70 transition-colors hover:bg-teal-100 hover:text-teal-900 dark:text-teal-200/70 dark:hover:bg-teal-950/50 dark:hover:text-teal-100"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="inventory-catalog-header">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={openCreate}
            className="btn-brand inventory-primary-cta inventory-primary-cta-toolbar"
          >
            <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
            Nuevo producto
          </Button>
          <CatalogPreviewTrigger onClick={() => setPreviewOpen(true)} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inventory-toolbar min-w-0 flex-1">
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

          <DropdownMenu
            align="end"
            trigger={
              <Button
                type="button"
                variant="outline"
                disabled={exporting || exportingPdf || exportingCsv}
                aria-label="Más acciones de inventario"
                className="h-10 shrink-0 gap-2 px-3 text-sm font-semibold sm:px-4"
              >
                {exporting || exportingPdf || exportingCsv ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>Más acciones</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              </Button>
            }
          >
            {(close) => (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    setImportSheetOpen(true);
                  }}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Importar productos
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exporting}
                  onClick={() => {
                    close();
                    handleExportExcel();
                  }}
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingPdf}
                  onClick={() => {
                    close();
                    handleExportPdf();
                  }}
                >
                  {exportingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingCsv}
                  onClick={() => {
                    close();
                    handleExportCsv();
                  }}
                >
                  {exportingCsv ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Table className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    const anchor = document.createElement("a");
                    anchor.href = PRODUCT_IMPORT_TEMPLATE_PATH;
                    anchor.download = PRODUCT_IMPORT_TEMPLATE_FILENAME;
                    anchor.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Descargar plantilla
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </div>

      {refreshError && (
        <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {refreshError}
        </p>
      )}

      {stockFilter === "critical" ? (
        <div className="inventory-critical-banner mb-4" role="status">
          <p>
            Mostrando <strong>{filtered.length}</strong> producto
            {filtered.length === 1 ? "" : "s"} con stock crítico (≤{" "}
            {CRITICAL_STOCK_THRESHOLD} unidades).
          </p>
          {onStockFilterChange ? (
            <button
              type="button"
              onClick={() => onStockFilterChange("all")}
              className="inventory-critical-banner-action"
            >
              Ver catálogo completo
            </button>
          ) : null}
        </div>
      ) : null}

      {exportError && (
        <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {exportError}
        </p>
      )}

      {products.length === 0 ? (
        <div className="card-panel flex flex-col items-center border-dashed py-12 text-center">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Sin productos en el catálogo
          </h2>
          <p className="mt-1.5 max-w-sm text-xs text-zinc-500">
            Crea tu primer producto para empezar a vender.
          </p>
          <Button onClick={openCreate} className="btn-brand inventory-primary-cta mt-6">
            <Plus className="h-5 w-5" aria-hidden="true" />
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
                      {stockFilter === "critical"
                        ? "No hay productos con stock crítico en este momento."
                        : "No hay productos que coincidan con tu búsqueda."}
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

      {stockFilter !== "critical" &&
      criticalStockCount > 0 &&
      onStockFilterChange ? (
        <div className="inventory-critical-hint mt-4" role="status">
          <p>
            Tienes{" "}
            <strong className="tabular-nums">{criticalStockCount}</strong>{" "}
            producto{criticalStockCount === 1 ? "" : "s"} con bajo stock.
          </p>
          <button
            type="button"
            onClick={() => onStockFilterChange("critical")}
            className="inventory-critical-banner-action"
          >
            Ver productos críticos
          </button>
        </div>
      ) : null}

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
        onSaved={handleProductSaved}
        onLimitHit={() => {
          setSheetOpen(false);
          setTrialDialogOpen(true);
        }}
      />

      <TrialLimitDialog
        open={trialDialogOpen}
        onOpenChange={setTrialDialogOpen}
        trialEligible={productLimitContext?.trial.eligible ?? false}
      />

      <CatalogPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        store={store}
        products={products}
        exchangeRate={exchangeRate}
        exchangeRateUpdatedAt={exchangeRateUpdatedAt}
        settings={previewSettings}
      />

      <CatalogPdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={handlePdfPreviewOpenChange}
        previewUrl={pdfPreviewUrl}
        fileBase64={pdfPreviewBase64}
        fileName={pdfPreviewFileName}
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
