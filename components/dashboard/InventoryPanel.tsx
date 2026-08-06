"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Loader2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { formatUsd, formatVes } from "@/lib/format";
import {
  CRITICAL_STOCK_THRESHOLD,
  catalogStockFilterToParam,
  getProductStockQuantity,
  isCriticalStock,
  isOutOfStock,
  matchesCriticalStockFilter,
  type CatalogStockFilter,
} from "@/lib/inventory/stock-status";
import { isOpenStockQuantity } from "@/lib/inventory/open-stock";
import { deleteProduct, fetchInventoryProducts, adjustProductStock, reorderProducts } from "@/lib/products/actions";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";
import { hasMultipleVariants } from "@/lib/products/variants";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CatalogPreviewDrawer,
  CatalogPreviewTrigger,
} from "@/components/dashboard/CatalogPreviewDrawer";
import { InventoryPagination } from "@/components/dashboard/InventoryPagination";

import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import { fetchStoreProductFormConfig } from "@/lib/products/fetch-store-product-form-config";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import type { ProTrialSetupPick } from "@/lib/onboarding/setup-status";
import { shouldShowProductLimitBanner } from "@/src/config/plans";
import { ProductLimitBanner } from "@/components/dashboard/ProductLimitBanner";
import { TrialLimitDialog } from "@/components/dashboard/plans/TrialLimitDialog";
import { ProTrialClaimModal } from "@/components/dashboard/plans/ProTrialClaimModal";
import { isProTrialUnlockReady } from "@/lib/plans/trial-unlock";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import type { PublishedProductResult } from "@/components/dashboard/QuickProductForm";
import {
  buildOptimisticCatalogItem,
  isCatalogItemUploading,
  isOptimisticProductId,
  type OptimisticProductDraft,
} from "@/lib/products/optimistic-catalog-item";
import type { ProductFormState } from "@/lib/products/actions";
import { revokeProductImagePreview } from "@/lib/product-image-picker";
import {
  InventoryProductOrderCell,
  reorderProductIds,
} from "@/components/dashboard/InventoryProductOrderCell";
import { PCBuilderInventoryBanner } from "@/components/dashboard/PCBuilderInventoryBanner";
import { isProductOnSale } from "@/lib/catalog/pricing";
import {
  INVENTORY_PAGE_SIZE,
  INVENTORY_PAGE_SIZE_OPTIONS,
  type InventoryPageSize,
} from "@/lib/inventory/constants";
import { sanitizeInventorySearch } from "@/lib/inventory/search";
import { DashboardProductThumb } from "@/components/dashboard/DashboardProductThumb";
import { cn } from "@/lib/cn";
import {
  getPCBuilderSlotDefinition,
  resolvePCBuilderSlot,
  storeHasPCBuilderFromStore,
} from "@/lib/rubros/modules/tecnologia/pc-builder";

function InventoryPcBuilderSlotLabel({ product }: { product: CatalogListItem }) {
  const slotId = resolvePCBuilderSlot(product);
  if (!slotId) return null;

  return (
    <span className="mt-0.5 inline-flex rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
      PC: {getPCBuilderSlotDefinition(slotId).label}
    </span>
  );
}

function getInventoryPageOffset(page: number, pageSize: number): number {
  const safePage = Math.max(1, Math.floor(page) || 1);
  return (safePage - 1) * pageSize;
}

function getInventoryTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

const STOCK_FILTER_OPTIONS: Array<{ value: CatalogStockFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "critical", label: "Con stock bajo" },
  { value: "out", label: "Agotados" },
];

const SEARCH_DEBOUNCE_MS = 300;

function syncCatalogQueryUrl(state: {
  stockFilter: CatalogStockFilter;
  searchQuery: string;
  page: number;
  pageSize: InventoryPageSize;
}) {
  const params = new URLSearchParams(window.location.search);
  const stockParam = catalogStockFilterToParam(state.stockFilter);
  if (stockParam) params.set("stock", stockParam);
  else params.delete("stock");

  const search = sanitizeInventorySearch(state.searchQuery);
  if (search) params.set("q", search);
  else params.delete("q");

  if (state.page > 1) params.set("page", String(state.page));
  else params.delete("page");

  if (state.pageSize !== INVENTORY_PAGE_SIZE) params.set("per", String(state.pageSize));
  else params.delete("per");

  const query = params.toString();
  const nextUrl = query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo";
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === nextUrl) return;
  window.history.replaceState(null, "", nextUrl);
}

const ProductFormSheet = dynamic(
  () =>
    import("@/components/dashboard/ProductFormSheet").then(
      (mod) => mod.ProductFormSheet,
    ),
  { ssr: false },
);

interface InventoryPanelProps {
  store: Store;
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  initialProducts: CatalogListItem[];
  initialTotalCount?: number;
  initialCriticalStockCount?: number;
  productFormConfig: StoreProductFormConfig;
  previewSettings: CatalogPreviewSettings;
  autoOpenCreate?: boolean;
  onAutoOpenCreateHandled?: () => void;
  initialStockFilter?: CatalogStockFilter;
  initialSearchQuery?: string;
  initialPage?: number;
  initialPageSize?: InventoryPageSize;
  productLimitContext?: StoreProductLimitContext | null;
  rubroLabel?: string;
  onSampleProductsCreated?: () => void;
  setupStatus?: ProTrialSetupPick;
  /** Fuerza fetch al montar (cuando el server no hidrató inventario). */
  loadOnMount?: boolean;
}

const StockBadge = memo(function StockBadge({
  stockQuantity,
}: {
  stockQuantity: number;
}) {
  if (stockQuantity <= 0) {
    return <span className="stock-badge stock-badge-out">Agotado</span>;
  }

  if (isOpenStockQuantity(stockQuantity)) {
    return <span className="stock-badge stock-badge-ok">Disponible</span>;
  }

  if (stockQuantity <= CRITICAL_STOCK_THRESHOLD) {
    return <span className="stock-badge stock-badge-critical">Stock bajo</span>;
  }

  return null;
});

const InventoryPriceDisplay = memo(function InventoryPriceDisplay({
  priceUsd,
  priceVes,
  compareAtUsd,
}: {
  priceUsd: number | null;
  priceVes: number | null;
  compareAtUsd?: number | null;
}) {
  const onSale = isProductOnSale(compareAtUsd, priceUsd);

  return (
    <div className="inventory-price-stack">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="price-usd-cell">
          {priceUsd != null ? formatUsd(priceUsd) : "—"}
        </span>
        {onSale && compareAtUsd != null ? (
          <span className="text-[11px] text-zinc-400 line-through">
            {formatUsd(compareAtUsd)}
          </span>
        ) : null}
        {onSale ? (
          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
            Oferta
          </span>
        ) : null}
      </div>
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

const stockAdjustBtnClass =
  "inventory-stock-adjust-btn inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:h-7 sm:w-7";

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
  const containerClass =
    layout === "spread"
      ? "flex flex-col gap-2"
      : "flex flex-col gap-2";

  return (
    <div className={containerClass} aria-busy={adjustingStock || undefined}>
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
              disabled={hasVariants || availableStock <= 0}
              className={stockAdjustBtnClass}
              aria-label={`Restar stock de ${productName}`}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <div className="flex min-w-[2.75rem] flex-col items-center">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums transition-colors",
                adjustingStock && "text-teal-600 dark:text-teal-400",
                !adjustingStock && out && "text-zinc-400",
                !adjustingStock &&
                  critical &&
                  !out &&
                  "text-orange-600 dark:text-orange-400",
                !adjustingStock &&
                  !out &&
                  !critical &&
                  "text-zinc-900 dark:text-zinc-50",
              )}
            >
              {isOpenStockQuantity(stockQuantity) ? "—" : stockQuantity}
            </span>
            <StockBadge stockQuantity={stockQuantity} />
          </div>
          {!hasVariants && (
            <button
              type="button"
              onClick={() => onStockAdjust(productId, 1)}
              disabled={hasVariants}
              className={stockAdjustBtnClass}
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
  position,
  total,
  reorderEnabled,
  reorderPending,
  adjustingStock,
  uploading,
  onEdit,
  onDelete,
  onStockAdjust,
  onPositionCommit,
  onDropOnRow,
  showPcBuilderSlot = false,
}: {
  product: CatalogListItem;
  position: number;
  total: number;
  reorderEnabled: boolean;
  reorderPending: boolean;
  adjustingStock: boolean;
  uploading?: boolean;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  onPositionCommit: (productId: string, nextPosition: number) => void;
  onDropOnRow: (draggedProductId: string, targetProductId: string) => void;
  showPcBuilderSlot?: boolean;
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
      className={`inventory-row group ${critical ? "inventory-row-low-stock" : ""} ${out ? "inventory-row-out-stock" : ""} ${uploading ? "inventory-row-uploading" : ""}`}
      aria-busy={uploading || undefined}
      onDragOver={(event) => {
        if (!reorderEnabled || uploading) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!reorderEnabled || uploading) return;
        event.preventDefault();
        const draggedProductId = event.dataTransfer.getData("text/plain");
        if (draggedProductId) {
          onDropOnRow(draggedProductId, product.product_id);
        }
      }}
    >
      {reorderEnabled ? (
        <td className="inventory-td w-24">
          <InventoryProductOrderCell
            productId={product.product_id}
            position={position}
            total={total}
            pending={reorderPending}
            onPositionCommit={onPositionCommit}
          />
        </td>
      ) : null}
      <td className="inventory-td inventory-td-thumb w-12">
        <div className="relative">
          <DashboardProductThumb name={product.product_name} thumbUrl={product.thumb_url} />
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70 dark:bg-zinc-950/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700 dark:text-teal-300" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </td>
      <td className="inventory-td">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {product.product_name}
          </p>
          {uploading ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Subiendo…
            </p>
          ) : product.category_name ? (
            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {product.category_name}
            </p>
          ) : null}
          {!uploading && showPcBuilderSlot ? (
            <InventoryPcBuilderSlotLabel product={product} />
          ) : null}
        </div>
      </td>
      <td className="inventory-td">
        <InventoryStockControls
          productName={product.product_name}
          productId={product.product_id}
          availableStock={product.available_stock}
          stockQuantity={stockQuantity}
          hasVariants={productHasVariants || Boolean(uploading)}
          adjustingStock={adjustingStock}
          onStockAdjust={onStockAdjust}
        />
      </td>
      <td className="inventory-td">
        <InventoryPriceDisplay
          priceUsd={product.price_usd}
          priceVes={product.price_ves}
          compareAtUsd={product.compare_at_usd}
        />
      </td>
      <td className="inventory-td inventory-td-actions">
        {!uploading ? (
          <InventoryActionsMenu
            productName={product.product_name}
            productId={product.product_id}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <span className="sr-only">Subiendo producto</span>
        )}
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
  uploading,
  showPcBuilderSlot = false,
}: {
  product: CatalogListItem;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onStockAdjust: (productId: string, delta: number) => void;
  adjustingStock: boolean;
  uploading?: boolean;
  showPcBuilderSlot?: boolean;
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
      className={`inventory-mobile-card ${critical ? "inventory-mobile-card-low" : ""} ${out ? "inventory-mobile-card-out" : ""} ${uploading ? "inventory-row-uploading" : ""}`}
      aria-busy={uploading || undefined}
    >
      <div className="flex items-start gap-3">
        <DashboardProductThumb
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
              {uploading ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Subiendo…
                </p>
              ) : product.category_name ? (
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {product.category_name}
                </p>
              ) : null}
              {!uploading && showPcBuilderSlot ? (
                <InventoryPcBuilderSlotLabel product={product} />
              ) : null}
            </div>
            {!uploading ? (
              <InventoryActionsMenu
                productName={product.product_name}
                productId={product.product_id}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : null}
          </div>
          <div className="mt-2">
            <InventoryPriceDisplay
              priceUsd={product.price_usd}
              priceVes={product.price_ves}
              compareAtUsd={product.compare_at_usd}
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
          hasVariants={productHasVariants || Boolean(uploading)}
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
  initialTotalCount,
  initialCriticalStockCount = 0,
  productFormConfig,
  previewSettings,
  autoOpenCreate = false,
  onAutoOpenCreateHandled,
  initialStockFilter = "all",
  initialSearchQuery = "",
  initialPage = 1,
  initialPageSize = INVENTORY_PAGE_SIZE,
  productLimitContext = null,
  rubroLabel = "",
  onSampleProductsCreated,
  setupStatus,
  loadOnMount = false,
}: InventoryPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [totalCount, setTotalCount] = useState(
    initialTotalCount ?? initialProducts.length,
  );
  const [criticalStockCount, setCriticalStockCount] = useState(
    initialCriticalStockCount,
  );
  const [stockFilter, setStockFilter] = useState<CatalogStockFilter>(initialStockFilter);
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<InventoryPageSize>(initialPageSize);
  const [filterLoading, setFilterLoading] = useState(loadOnMount);
  const skipQueryEffectRef = useRef(!loadOnMount);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [liveProductFormConfig, setLiveProductFormConfig] =
    useState(productFormConfig);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CatalogListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [adjustingProductIds, setAdjustingProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const pendingStockDeltasRef = useRef<Map<string, number>>(new Map());
  const stockAdjustInFlightRef = useRef<Set<string>>(new Set());
  const [refreshing, startRefresh] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const markStockAdjusting = useCallback((productId: string, active: boolean) => {
    setAdjustingProductIds((prev) => {
      const has = prev.has(productId);
      if (active === has) return prev;
      const next = new Set(prev);
      if (active) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }, []);

  useEffect(() => {
    setLiveProductFormConfig(productFormConfig);
  }, [productFormConfig]);

  useEffect(() => {
    void import("@/components/dashboard/ProductFormSheet");
    void fetchStoreProductFormConfig().then((result) => {
      if (result.config) {
        setLiveProductFormConfig(result.config);
      }
    });
  }, []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reorderingProductId, setReorderingProductId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const totalPages = getInventoryTotalPages(totalCount, pageSize);
  const hasActiveQuery = Boolean(searchQuery) || stockFilter !== "all";
  const reorderEnabled =
    stockFilter === "all" && !searchQuery && totalCount > 0 && totalCount <= pageSize;
  const pcBuilderEnabled = storeHasPCBuilderFromStore(store);

  const filtered = products;

  const emptyMessage = useMemo(() => {
    if (searchQuery) {
      return `No hay productos que coincidan con “${searchQuery}”.`;
    }
    if (stockFilter === "critical") {
      return "No hay productos con stock bajo en este momento.";
    }
    if (stockFilter === "out") {
      return "No hay productos agotados.";
    }
    return "Sin productos.";
  }, [searchQuery, stockFilter]);

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
      setProducts((prev) => {
        const optimistic = prev.filter((item) =>
          isOptimisticProductId(item.product_id),
        );
        setTotalCount(result.totalCount + optimistic.length);
        return [...optimistic, ...result.products];
      });
      return true;
    },
    [],
  );

  const loadInventoryPage = useCallback(
    async (next: {
      page: number;
      pageSize: InventoryPageSize;
      stockFilter: CatalogStockFilter;
      searchQuery: string;
    }) => {
      const result = await fetchInventoryProducts({
        offset: getInventoryPageOffset(next.page, next.pageSize),
        limit: next.pageSize,
        stockFilter: next.stockFilter,
        search: next.searchQuery,
      });

      if (!applyInventoryRefresh(result)) {
        return result;
      }

      const nextTotalPages = getInventoryTotalPages(result.totalCount, next.pageSize);
      if (next.page > nextTotalPages && result.totalCount > 0) {
        const correctedPage = nextTotalPages;
        const corrected = await fetchInventoryProducts({
          offset: getInventoryPageOffset(correctedPage, next.pageSize),
          limit: next.pageSize,
          stockFilter: next.stockFilter,
          search: next.searchQuery,
        });
        applyInventoryRefresh(corrected);
        setPage(correctedPage);
        syncCatalogQueryUrl({
          stockFilter: next.stockFilter,
          searchQuery: next.searchQuery,
          page: correctedPage,
          pageSize: next.pageSize,
        });
        return corrected;
      }

      return result;
    },
    [applyInventoryRefresh],
  );

  const refreshProducts = useCallback(() => {
    startRefresh(async () => {
      await loadInventoryPage({ page, pageSize, stockFilter, searchQuery });
    });
  }, [loadInventoryPage, page, pageSize, searchQuery, stockFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextSearch = sanitizeInventorySearch(searchInput);
      if (nextSearch === searchQuery) return;
      setSearchQuery(nextSearch);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [searchInput, searchQuery]);

  useEffect(() => {
    if (skipQueryEffectRef.current) {
      skipQueryEffectRef.current = false;
      syncCatalogQueryUrl({ stockFilter, searchQuery, page, pageSize });
      return;
    }

    let cancelled = false;
    setFilterLoading(true);
    syncCatalogQueryUrl({ stockFilter, searchQuery, page, pageSize });

    const CLIENT_FETCH_TIMEOUT_MS = 12_000;

    void (async () => {
      try {
        await Promise.race([
          loadInventoryPage({ page, pageSize, stockFilter, searchQuery }),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error("timeout:loadInventoryPage")),
              CLIENT_FETCH_TIMEOUT_MS,
            );
          }),
        ]);
      } catch (error) {
        if (!cancelled) {
          console.error("[InventoryPanel] loadInventoryPage", error);
          setRefreshError(
            "No se pudo cargar el inventario a tiempo. Revisa tu conexión o recarga.",
          );
        }
      } finally {
        if (!cancelled) setFilterLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadInventoryPage, page, pageSize, searchQuery, stockFilter]);

  const handleStockFilterChange = useCallback((nextFilter: CatalogStockFilter) => {
    setStockFilter(nextFilter);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(Math.max(1, nextPage));
  }, []);

  const handlePageSizeChange = useCallback((nextSize: InventoryPageSize) => {
    setPageSize(nextSize);
    setPage(1);
  }, []);

  const handleProductSaved = useCallback(
    (result?: PublishedProductResult) => {
      // Create optimista: la fila ya está; el refresh llega en settled.
      if (result) return;
      // Edición u otros flujos sin draft optimista.
      refreshProducts();
    },
    [refreshProducts],
  );

  const handleOptimisticCreate = useCallback(
    (draft: OptimisticProductDraft) => {
      const item = buildOptimisticCatalogItem(store, draft);
      setProducts((prev) => [item, ...prev.filter((p) => p.product_id !== draft.tempId)]);
      setTotalCount((count) => count + 1);
      setRefreshError(null);
    },
    [store],
  );

  const handleOptimisticCreateSettled = useCallback(
    (tempId: string, result: ProductFormState) => {
      setProducts((prev) => {
        const current = prev.find((item) => item.product_id === tempId);
        if (current?.thumb_url?.startsWith("blob:")) {
          revokeProductImagePreview(current.thumb_url);
        }

        if (!result.success) {
          return prev.filter((item) => item.product_id !== tempId);
        }

        if (result.productId) {
          return prev.map((item) => {
            if (item.product_id !== tempId) return item;
            return {
              ...item,
              product_id: result.productId!,
              product_slug: result.productSlug ?? item.product_slug,
              product_name: result.productName ?? item.product_name,
              thumb_url: result.thumbUrl ?? item.thumb_url,
              metadata: {
                ...(item.metadata ?? {}),
                optimisticUploading: false,
              },
            };
          });
        }

        return prev.filter((item) => item.product_id !== tempId);
      });

      if (!result.success) {
        setTotalCount((count) => Math.max(0, count - 1));
        setRefreshError(
          result.error ?? "No se pudo publicar el producto. Intenta de nuevo.",
        );
        return;
      }

      requestDashboardShellRefresh();
      refreshProducts();
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

  const handleStockAdjust = useCallback(
    (productId: string, delta: number) => {
      const product = productById.get(productId);
      if (!product || hasMultipleVariants(product)) return;

      const currentStock = getProductStockQuantity(product);
      if (delta < 0 && currentStock <= 0) return;

      // Feedback inmediato: el número cambia al clic; el servidor confirma después.
      setProducts((prev) =>
        prev.map((item) => {
          if (item.product_id !== productId) return item;
          const next = Math.max(0, getProductStockQuantity(item) + delta);
          return {
            ...item,
            available_stock: next,
            stock_quantity: next,
          };
        }),
      );

      const queued =
        (pendingStockDeltasRef.current.get(productId) ?? 0) + delta;
      pendingStockDeltasRef.current.set(productId, queued);
      markStockAdjusting(productId, true);

      if (stockAdjustInFlightRef.current.has(productId)) return;

      void (async () => {
        stockAdjustInFlightRef.current.add(productId);
        try {
          while (pendingStockDeltasRef.current.has(productId)) {
            const batchDelta = pendingStockDeltasRef.current.get(productId) ?? 0;
            pendingStockDeltasRef.current.delete(productId);
            if (batchDelta === 0) continue;

            const result = await adjustProductStock(productId, batchDelta);
            if (result.error) {
              pendingStockDeltasRef.current.delete(productId);
              await loadInventoryPage({
                page,
                pageSize,
                stockFilter,
                searchQuery,
              });
              break;
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
              pendingStockDeltasRef.current.delete(productId);
              await loadInventoryPage({
                page,
                pageSize,
                stockFilter,
                searchQuery,
              });
              break;
            }
          }
        } finally {
          stockAdjustInFlightRef.current.delete(productId);
          if (!pendingStockDeltasRef.current.has(productId)) {
            markStockAdjusting(productId, false);
          }
        }
      })();
    },
    [
      loadInventoryPage,
      markStockAdjusting,
      page,
      pageSize,
      productById,
      searchQuery,
      stockFilter,
    ],
  );

  const applyProductOrder = useCallback(
    async (nextIds: string[]) => {
      const productMap = new Map(
        products.map((product) => [product.product_id, product]),
      );
      const nextProducts = nextIds
        .map((id) => productMap.get(id))
        .filter((product): product is CatalogListItem => product != null);

      if (nextProducts.length !== nextIds.length) {
        refreshProducts();
        return false;
      }

      setProducts(nextProducts);
      const result = await reorderProducts(nextIds);
      if (result.error) {
        setReorderError(result.error);
        refreshProducts();
        return false;
      }

      setReorderError(null);
      return true;
    },
    [products, refreshProducts],
  );

  const handlePositionCommit = useCallback(
    async (productId: string, nextPosition: number) => {
      if (!reorderEnabled) return;

      const currentIds = products.map((product) => product.product_id);
      const nextIds = reorderProductIds(currentIds, productId, nextPosition - 1);
      if (nextIds.join("|") === currentIds.join("|")) return;

      setReorderingProductId(productId);
      await applyProductOrder(nextIds);
      setReorderingProductId(null);
    },
    [applyProductOrder, products, reorderEnabled],
  );

  const handleDropOnRow = useCallback(
    async (draggedProductId: string, targetProductId: string) => {
      if (!reorderEnabled || draggedProductId === targetProductId) return;

      const targetIndex = products.findIndex(
        (product) => product.product_id === targetProductId,
      );
      if (targetIndex < 0) return;

      const currentIds = products.map((product) => product.product_id);
      const nextIds = reorderProductIds(currentIds, draggedProductId, targetIndex);
      if (nextIds.join("|") === currentIds.join("|")) return;

      setReorderingProductId(draggedProductId);
      await applyProductOrder(nextIds);
      setReorderingProductId(null);
    },
    [applyProductOrder, products, reorderEnabled],
  );

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
      if (!hasActiveQuery) return null;
      return (
        <p className="py-10 text-center text-xs text-zinc-500">{emptyMessage}</p>
      );
    }

    return filtered.map((product) => {
      const isAdjusting = adjustingProductIds.has(product.product_id);
      const uploading = isCatalogItemUploading(product);
      return (
        <InventoryMobileCard
          key={product.product_id}
          product={product}
          onEdit={openEdit}
          onDelete={handleDeleteRequest}
          onStockAdjust={handleStockAdjust}
          adjustingStock={isAdjusting}
          uploading={uploading}
          showPcBuilderSlot={pcBuilderEnabled}
        />
      );
    });
  }, [
    filtered,
    adjustingProductIds,
    emptyMessage,
    hasActiveQuery,
    openEdit,
    handleDeleteRequest,
    handleStockAdjust,
    pcBuilderEnabled,
  ]);

  const catalogEmpty = products.length === 0 && !hasActiveQuery && !filterLoading;

  return (
    <>
      {productLimitContext &&
      shouldShowProductLimitBanner(productLimitContext) ? (
        <ProductLimitBanner
          productLimit={productLimitContext}
          trial={productLimitContext.trial}
          setupStatus={setupStatus}
        />
      ) : null}

      {pcBuilderEnabled ? <PCBuilderInventoryBanner /> : null}

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
      </div>

      {refreshError && (
        <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {refreshError}
        </p>
      )}

      <div className="inventory-toolbar-filters">
        <div className="inventory-search-wrap">
          <Search className="inventory-search-icon" aria-hidden="true" />
          <input
            id="inventory-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="inventory-search-input pr-10"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Buscar productos por nombre o SKU"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="inventory-search-clear"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inventory-stock-filters"
            role="tablist"
            aria-label="Filtrar por estado de stock"
          >
            {STOCK_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={stockFilter === option.value}
                onClick={() => handleStockFilterChange(option.value)}
                className={cn(
                  "inventory-stock-chip",
                  stockFilter === option.value && "inventory-stock-chip-active",
                )}
              >
                {option.label}
                {option.value === "critical" && criticalStockCount > 0 ? (
                  <span className="ml-1.5 tabular-nums opacity-80">
                    ({criticalStockCount})
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <label className="inventory-page-size">
            <span>Por página</span>
            <select
              className="inventory-page-size-select"
              value={pageSize}
              onChange={(event) =>
                handlePageSizeChange(
                  Number(event.target.value) === 50 ? 50 : INVENTORY_PAGE_SIZE,
                )
              }
              aria-label="Productos por página"
            >
              {INVENTORY_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {stockFilter === "critical" ? (
        <div className="inventory-critical-banner mb-4" role="status">
          <p>
            Mostrando productos con stock bajo (≤ {CRITICAL_STOCK_THRESHOLD}{" "}
            unidades). {totalCount} resultado{totalCount === 1 ? "" : "s"}.
          </p>
          <button
            type="button"
            onClick={() => handleStockFilterChange("all")}
            className="inventory-critical-banner-action"
          >
            Ver catálogo completo
          </button>
        </div>
      ) : null}

      {stockFilter === "out" ? (
        <div className="inventory-critical-banner mb-4" role="status">
          <p>
            Mostrando productos agotados. {totalCount} resultado
            {totalCount === 1 ? "" : "s"}.
          </p>
          <button
            type="button"
            onClick={() => handleStockFilterChange("all")}
            className="inventory-critical-banner-action"
          >
            Ver catálogo completo
          </button>
        </div>
      ) : null}

      {reorderError && (
        <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {reorderError}
        </p>
      )}

      {reorderEnabled && products.length > 1 ? (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Arrastra o cambia la posición numérica para definir el orden del catálogo
          público. Los productos nuevos aparecen primero por defecto.
        </p>
      ) : null}

      {!reorderEnabled && !hasActiveQuery && totalCount > pageSize ? (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          El reordenamiento del catálogo público está disponible cuando todos los
          productos caben en una sola página.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="inventory-mobile-list" aria-label="Lista de productos">
            {inventoryList}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="inventory-table inventory-table-dense w-full">
              <thead>
                <tr className="bg-zinc-50/95 dark:bg-zinc-900/70">
                  {reorderEnabled ? (
                    <th scope="col" className="inventory-th inventory-th-dense w-24">
                      Orden
                    </th>
                  ) : null}
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
                      colSpan={reorderEnabled ? 6 : 5}
                      className={cn(
                        "inventory-td inventory-td-dense text-center text-xs text-zinc-400 dark:text-zinc-500",
                        catalogEmpty ? "py-16" : "py-10",
                      )}
                    >
                      {filterLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Cargando productos…
                        </span>
                      ) : hasActiveQuery ? (
                        emptyMessage
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  filtered.map((product, index) => (
                    <InventoryRow
                      key={product.product_id}
                      product={product}
                      position={index}
                      total={filtered.length}
                      reorderEnabled={reorderEnabled && !isCatalogItemUploading(product)}
                      reorderPending={reorderingProductId === product.product_id}
                      onEdit={openEdit}
                      onDelete={handleDeleteRequest}
                      onStockAdjust={handleStockAdjust}
                      adjustingStock={adjustingProductIds.has(product.product_id)}
                      uploading={isCatalogItemUploading(product)}
                      onPositionCommit={handlePositionCommit}
                      onDropOnRow={handleDropOnRow}
                      showPcBuilderSlot={pcBuilderEnabled}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(refreshing || filterLoading) && (
            <div className="flex items-center justify-center gap-1.5 border-t border-zinc-200/70 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Actualizando…
            </div>
          )}

          {totalCount > 0 ? (
            <InventoryPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              disabled={filterLoading || refreshing}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>

      {stockFilter === "all" &&
      !searchQuery &&
      criticalStockCount > 0 ? (
        <div className="inventory-critical-hint mt-4" role="status">
          <p>
            Tienes{" "}
            <strong className="tabular-nums">{criticalStockCount}</strong>{" "}
            producto{criticalStockCount === 1 ? "" : "s"} con bajo stock.
          </p>
          <button
            type="button"
            onClick={() => handleStockFilterChange("critical")}
            className="inventory-critical-banner-action"
          >
            Ver productos con stock bajo
          </button>
        </div>
      ) : null}

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        store={store}
        exchangeRate={exchangeRate}
        productFormConfig={liveProductFormConfig}
        mode={sheetMode}
        productId={editingProductId}
        catalogEmpty={catalogEmpty && sheetMode === "create"}
        rubroLabel={rubroLabel}
        onSaved={handleProductSaved}
        onOptimisticCreate={handleOptimisticCreate}
        onOptimisticCreateSettled={handleOptimisticCreateSettled}
        onSamplesCreated={() => {
          onSampleProductsCreated?.();
          refreshProducts();
          setSheetOpen(false);
        }}
        onLimitHit={() => {
          setSheetOpen(false);
          const eligible = productLimitContext?.trial.eligible ?? false;
          if (
            eligible &&
            setupStatus &&
            isProTrialUnlockReady(setupStatus)
          ) {
            setClaimModalOpen(true);
          } else {
            setTrialDialogOpen(true);
          }
        }}
      />

      <TrialLimitDialog
        open={trialDialogOpen}
        onOpenChange={setTrialDialogOpen}
        trialEligible={productLimitContext?.trial.eligible ?? false}
        setupStatus={setupStatus}
        proProductLimit={productLimitContext?.productLimit ?? null}
        onOpenClaimModal={() => setClaimModalOpen(true)}
      />

      <ProTrialClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
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
