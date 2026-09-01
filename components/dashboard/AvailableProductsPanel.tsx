"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Check,
  ChevronDown,
  FolderPlus,
  Loader2,
  Package,
  PackagePlus,
  Search,
  X,
} from "lucide-react";
import {
  applyDropshipCatalogMarginPercent,
  importSupplierProductToStoreCatalog,
  listActiveSupplierCatalogForMerchant,
  removeSupplierProductFromStoreCatalog,
  setDropshipCatalogRetailPrice,
  type MerchantSupplierCatalogProduct,
} from "@/lib/dropship/actions";
import { importSupplierProductsBulkToStore } from "@/lib/dropship/bulk-import";
import { CatalogMoneyInput } from "@/components/dashboard/CatalogMoneyInput";
import { SocialImageDownloadButton } from "@/components/dashboard/SocialImageDownloadButton";
import { CopyProductPublicLinkButton } from "@/components/dashboard/CopyProductPublicLinkButton";
import { ProductImageGallery } from "@/components/catalog/ProductImageGallery";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatUsd } from "@/lib/format";
import { urlsToCatalogGalleryImages } from "@/lib/products/product-gallery-types";
import {
  SUPPLIER_PRODUCT_CATEGORIES,
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  formatSupplierAmountInput,
  mayoristaFromMarginPercent,
  marginPercentFromPrices,
  parsePercentAmount,
  parseUsdAmount,
} from "@/lib/supplier/wholesale-price";
import { cn } from "@/lib/cn";

type CategoryFilter = "all" | SupplierProductCategory;
type BulkMode = "all" | "category" | null;

type PriceDraft = {
  retail: string;
  marginPercent: string;
};

function catalogImageUrls(product: MerchantSupplierCatalogProduct): string[] {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls;
  }
  return product.imageUrl ? [product.imageUrl] : [];
}

function draftsFromProduct(product: MerchantSupplierCatalogProduct): PriceDraft {
  const retail = product.retailPriceUsd;
  return {
    retail: formatSupplierAmountInput(retail),
    marginPercent:
      retail == null
        ? ""
        : formatSupplierAmountInput(
            marginPercentFromPrices(product.wholesalePriceUsd, retail),
          ),
  };
}

function isPriceDirty(
  product: MerchantSupplierCatalogProduct,
  draft: PriceDraft,
): boolean {
  return parseUsdAmount(draft.retail) !== product.retailPriceUsd;
}

function stockBadgeMeta(stock: number): {
  label: string;
  className: string;
} {
  if (stock <= 0) {
    return {
      label: "Sin stock",
      className:
        "bg-zinc-900/75 text-white ring-1 ring-white/10 backdrop-blur-sm",
    };
  }
  if (stock <= 5) {
    return {
      label: `${stock} uds.`,
      className:
        "bg-amber-500/90 text-white ring-1 ring-white/20 backdrop-blur-sm",
    };
  }
  return {
    label: stock > 99 ? "99+ uds." : stock > 20 ? "En stock" : `${stock} uds.`,
    className:
      "bg-white/90 text-zinc-800 ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-950/85 dark:text-zinc-100 dark:ring-white/10",
  };
}

function SupplierCatalogCardMedia({
  product,
}: {
  product: MerchantSupplierCatalogProduct;
}) {
  const images = urlsToCatalogGalleryImages(catalogImageUrls(product));
  const stockBadge = stockBadgeMeta(product.stock);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100/80 dark:from-zinc-900 dark:to-zinc-950">
      <ProductImageGallery
        product={{ product_name: product.title }}
        images={images.length > 0 ? images : undefined}
        imageClassName="object-cover transition duration-500 group-hover:scale-[1.02]"
        fallbackClassName="absolute inset-0"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
      <span
        className={cn(
          "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm",
          stockBadge.className,
        )}
      >
        {stockBadge.label}
      </span>
      {product.alreadyImported ? (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
          <Check className="h-3 w-3" aria-hidden="true" />
          En tu tienda
        </span>
      ) : null}
    </div>
  );
}

interface AvailableProductsPanelProps {
  storeSlug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  onImported?: (productId: string) => void;
  className?: string;
}

export function AvailableProductsPanel({
  storeSlug,
  customDomain = null,
  customDomainVerified = false,
  onImported,
  className,
}: AvailableProductsPanelProps) {
  const [products, setProducts] = useState<MerchantSupplierCatalogProduct[]>(
    [],
  );
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [headerPercent, setHeaderPercent] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [applyingMargin, setApplyingMargin] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const [, startTransition] = useTransition();

  const productsRef = useRef(products);
  const draftsRef = useRef(priceDrafts);
  const saveTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    draftsRef.current = priceDrafts;
  }, [priceDrafts]);

  function hydrate(rows: MerchantSupplierCatalogProduct[]) {
    const drafts = Object.fromEntries(
      rows.map((row) => [row.id, draftsFromProduct(row)]),
    );
    productsRef.current = rows;
    draftsRef.current = drafts;
    setProducts(rows);
    setPriceDrafts(drafts);
  }

  const loadCatalog = useCallback(() => {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      const result = await listActiveSupplierCatalogForMerchant();
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      hydrate(result.products ?? []);
    });
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const categoryFacets = useMemo(() => {
    const counts = new Map<SupplierProductCategory, { total: number; pending: number }>();
    for (const product of products) {
      const category = normalizeSupplierProductCategory(product.category);
      const current = counts.get(category) ?? { total: 0, pending: 0 };
      current.total += 1;
      if (!product.alreadyImported) current.pending += 1;
      counts.set(category, current);
    }
    return SUPPLIER_PRODUCT_CATEGORIES.filter((item) =>
      counts.has(item.value),
    ).map((item) => ({
      ...item,
      count: counts.get(item.value)?.total ?? 0,
      pending: counts.get(item.value)?.pending ?? 0,
    }));
  }, [products]);

  const pendingAllCount = useMemo(
    () => products.filter((product) => !product.alreadyImported).length,
    [products],
  );

  const selectedCategoryMeta =
    categoryFilter === "all"
      ? null
      : categoryFacets.find((item) => item.value === categoryFilter) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (
        categoryFilter !== "all" &&
        normalizeSupplierProductCategory(product.category) !== categoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      const category = supplierCategoryLabel(product.category).toLowerCase();
      return (
        product.title.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        category.includes(q)
      );
    });
  }, [products, query, categoryFilter]);

  const hasActiveFilters =
    query.trim().length > 0 || categoryFilter !== "all";

  const selectedCount = useMemo(
    () => filtered.filter((product) => selectedIds[product.id]).length,
    [filtered, selectedIds],
  );

  const inStoreCount = useMemo(
    () => filtered.filter((product) => product.alreadyImported).length,
    [filtered],
  );

  const dirtyImportedCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.alreadyImported &&
          isPriceDirty(
            product,
            priceDrafts[product.id] ?? draftsFromProduct(product),
          ),
      ).length,
    [priceDrafts, products],
  );

  useEffect(() => {
    if (dirtyImportedCount === 0) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyImportedCount]);

  function replaceProduct(next: MerchantSupplierCatalogProduct) {
    setProducts((current) => {
      const rows = current.map((item) => (item.id === next.id ? next : item));
      productsRef.current = rows;
      return rows;
    });
    setPriceDrafts((current) => {
      const drafts = {
        ...current,
        [next.id]: draftsFromProduct(next),
      };
      draftsRef.current = drafts;
      return drafts;
    });
  }

  function patchDraft(
    product: MerchantSupplierCatalogProduct,
    patch: Partial<PriceDraft>,
  ) {
    setPriceDrafts((current) => {
      const drafts = {
        ...current,
        [product.id]: {
          ...(current[product.id] ?? draftsFromProduct(product)),
          ...patch,
        },
      };
      draftsRef.current = drafts;
      return drafts;
    });
  }

  async function persistPrice(productId: string) {
    const product = productsRef.current.find((item) => item.id === productId);
    const draft = draftsRef.current[productId];
    if (!product || !draft || !product.alreadyImported) return;
    if (!isPriceDirty(product, draft)) return;
    const parsed = parseUsdAmount(draft.retail, { min: 0 });
    if (parsed == null) return;

    setSavingIds((current) => ({ ...current, [productId]: true }));
    setError(null);
    try {
      const result = await setDropshipCatalogRetailPrice({
        supplierProductId: productId,
        retailUsd: parsed,
      });
      if (result.error || result.retailUsd == null) {
        setError(result.error ?? "No se pudo guardar el precio de venta.");
        return;
      }
      const latest = draftsRef.current[productId];
      const latestParsed = latest ? parseUsdAmount(latest.retail) : null;
      const nextProduct: MerchantSupplierCatalogProduct = {
        ...product,
        retailPriceUsd: result.retailUsd,
        suggestedRetailUsd: result.retailUsd,
        alreadyImported: true,
        linkedProductId: result.linkedProductId ?? product.linkedProductId,
      };
      if (latestParsed != null && latestParsed !== parsed) {
        setProducts((current) =>
          current.map((item) => (item.id === productId ? nextProduct : item)),
        );
        return;
      }
      replaceProduct(nextProduct);
    } finally {
      setSavingIds((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }

  function queueAutosave(productId: string) {
    const product = productsRef.current.find((item) => item.id === productId);
    if (!product?.alreadyImported) return;
    window.clearTimeout(saveTimers.current[productId]);
    saveTimers.current[productId] = window.setTimeout(() => {
      void persistPrice(productId);
    }, 650);
  }

  function onRetailChange(
    product: MerchantSupplierCatalogProduct,
    raw: string,
  ) {
    const parsed = parseUsdAmount(raw, { min: 0 });
    const percent =
      parsed == null
        ? ""
        : formatSupplierAmountInput(
            marginPercentFromPrices(product.wholesalePriceUsd, parsed),
          );
    patchDraft(product, { retail: raw, marginPercent: percent });
    queueAutosave(product.id);
  }

  function onMarginPercentChange(
    product: MerchantSupplierCatalogProduct,
    raw: string,
  ) {
    const parsed = parsePercentAmount(raw);
    const retail =
      parsed == null
        ? ""
        : formatSupplierAmountInput(
            mayoristaFromMarginPercent(product.wholesalePriceUsd, parsed),
          );
    patchDraft(product, { marginPercent: raw, retail });
    queueAutosave(product.id);
  }

  function toggleSelected(productId: string) {
    setSelectedIds((current) => {
      const next = { ...current };
      if (next[productId]) delete next[productId];
      else next[productId] = true;
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = { ...current };
      for (const product of filtered) next[product.id] = true;
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds({});
  }

  function buildBulkRetailOverrides(): Record<string, number> {
    const overrides: Record<string, number> = {};
    for (const product of productsRef.current) {
      const draft = draftsRef.current[product.id];
      const retail = parseUsdAmount(draft?.retail, { min: 0 });
      if (retail != null && retail > 0) {
        overrides[product.id] = retail;
      }
    }
    return overrides;
  }

  function handleBulk(mode: Exclude<BulkMode, null>) {
    if (mode === "category" && categoryFilter === "all") return;
    setBulkMode(mode);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await importSupplierProductsBulkToStore({
        ...(mode === "category" ? { category: categoryFilter } : {}),
        retailBySupplierId: buildBulkRetailOverrides(),
      });
      setBulkMode(null);
      if (result.error) {
        setError(result.error);
        if (result.importedSupplierIds?.length) {
          onImported?.(result.importedSupplierIds[0]);
          loadCatalog();
        }
        return;
      }
      if (result.importedSupplierIds?.length) {
        onImported?.(result.importedSupplierIds[0]);
      }
      setMessage(result.message ?? "Productos añadidos a tu tienda.");
      loadCatalog();
    });
  }

  function handleAdd(productId: string) {
    const draft = draftsRef.current[productId];
    const retailUsd = parseUsdAmount(draft?.retail, { min: 0 });
    setImportingId(productId);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await importSupplierProductToStoreCatalog(
        productId,
        retailUsd != null && retailUsd > 0 ? { retailUsd } : undefined,
      );
      setImportingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.ok && result.productId) {
        const linkedProductId = result.productId;
        const product = productsRef.current.find((item) => item.id === productId);
        setMessage(`“${result.productName}” añadido al catálogo de tu tienda.`);
        if (product) {
          replaceProduct({
            ...product,
            alreadyImported: true,
            linkedProductId,
            linkedProductSlug: result.productSlug ?? product.linkedProductSlug,
            retailPriceUsd: result.retailUsd ?? product.retailPriceUsd,
            suggestedRetailUsd: result.retailUsd ?? product.suggestedRetailUsd,
          });
        }
        onImported?.(linkedProductId);
      }
    });
  }

  function handleRemove(productId: string) {
    setRemovingId(productId);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await removeSupplierProductFromStoreCatalog(productId);
      setRemovingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Producto quitado del catálogo de tu tienda.");
      const product = productsRef.current.find((item) => item.id === productId);
      if (product) {
        replaceProduct({
          ...product,
          alreadyImported: false,
          linkedProductId: null,
          linkedProductSlug: null,
          retailPriceUsd: product.suggestedRetailUsd,
        });
      }
      onImported?.(productId);
    });
  }

  async function handleApplyMargin() {
    const percent = parsePercentAmount(headerPercent, { min: 0, max: 1000 });
    if (percent == null) {
      setError("Indica un porcentaje de ganancia válido.");
      return;
    }

    const selected = filtered
      .filter((product) => selectedIds[product.id])
      .map((product) => product.id);
    const targets =
      selected.length > 0
        ? selected
        : filtered
            .filter((product) => product.alreadyImported)
            .map((product) => product.id);

    if (targets.length === 0) {
      setError(
        "Marca productos o añade algunos a tu tienda para aplicar el %.",
      );
      return;
    }

    for (const productId of targets) {
      window.clearTimeout(saveTimers.current[productId]);
    }

    setApplyingMargin(true);
    setError(null);
    setMessage(null);
    try {
      const result = await applyDropshipCatalogMarginPercent({
        marginPercent: percent,
        supplierProductIds: targets,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const importedNote =
        result.imported && result.imported > 0
          ? ` Se añadieron ${result.imported} a tu tienda.`
          : "";
      setMessage(
        `Ganancia de ${percent}% aplicada a ${result.updated ?? 0} producto(s).${importedNote}`,
      );
      if (result.imported && result.imported > 0) {
        onImported?.(targets[0]);
      }
      loadCatalog();
    } finally {
      setApplyingMargin(false);
    }
  }

  const bulkBusy = bulkMode != null;
  const pricingBusy = applyingMargin || bulkBusy;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Catálogo mayorista
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Explora el catálogo mayorista y añade productos a tu tienda. Solo lo
            que selecciones aquí aparece en tu vitrina pública — sin inventario
            manual. El precio de venta que fijes en cada tarjeta es el que
            verán tus clientes.
          </p>
        </div>
        {products.length > 0 ? (
          <button
            type="button"
            className="btn-brand inline-flex min-h-11 shrink-0 items-center justify-center gap-2 !text-sm"
            onClick={() => handleBulk("all")}
            disabled={loading || bulkBusy || importingId != null || removingId != null || pendingAllCount === 0}
          >
            {bulkMode === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {pendingAllCount === 0
              ? "Todo el catálogo ya está en tu tienda"
              : bulkMode === "all"
                ? "Cargando productos…"
                : `Cargar todos los productos${pendingAllCount > 0 ? ` (${pendingAllCount})` : ""}`}
          </button>
        ) : null}
      </div>

      {products.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Ganancia de tu tienda
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Aplica un % sobre el precio mayorista. Si marcas productos, se
                usa en esos (y se añaden a tu tienda si aún no están). Si no
                marcas ninguno, se aplica a los que ya tienes en esta vista. Ese
                % queda como ganancia por defecto para productos nuevos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CatalogMoneyInput
                suffix="%"
                value={headerPercent}
                disabled={pricingBusy || loading}
                aria-label="Porcentaje de ganancia global"
                className="w-[7.5rem]"
                onChange={setHeaderPercent}
              />
              <Button
                type="button"
                variant="outline"
                disabled={pricingBusy || loading}
                onClick={() => void handleApplyMargin()}
              >
                {applyingMargin ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Aplicar %
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {selectedCount > 0 ? (
              <>
                <span>
                  {selectedCount} producto{selectedCount === 1 ? "" : "s"}{" "}
                  marcado{selectedCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                  onClick={clearSelection}
                >
                  Quitar selección
                </button>
              </>
            ) : (
              <>
                <span>
                  {inStoreCount} en tu tienda
                  {filtered.length !== products.length ? " en esta vista" : ""}
                </span>
                {filtered.length > 0 ? (
                  <button
                    type="button"
                    className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                    onClick={selectVisible}
                  >
                    Seleccionar visibles
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input-field !h-11 !rounded-xl !pl-9 !shadow-sm"
                placeholder="Buscar producto o categoría…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar en el catálogo mayorista"
              />
            </div>

            {products.length > 0 && categoryFacets.length > 0 ? (
              <label className="relative block lg:w-56">
                <span className="sr-only">Filtrar por categoría</span>
                <Select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value as CategoryFilter)
                  }
                  className="!h-11 !rounded-xl !pr-9"
                  aria-label="Filtrar por categoría"
                >
                  <option value="all">Todas las categorías</option>
                  {categoryFacets.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label} ({item.count})
                    </option>
                  ))}
                </Select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
              </label>
            ) : null}
          </div>

          {products.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                  {filtered.length}
                </span>{" "}
                de {products.length} producto
                {products.length === 1 ? "" : "s"}
                {hasActiveFilters ? " en esta selección" : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    onClick={() => {
                      setQuery("");
                      setCategoryFilter("all");
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Limpiar filtros
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-brand-outline inline-flex min-h-9 shrink-0 items-center justify-center gap-2 !rounded-full !px-4 !text-xs"
                  onClick={() => handleBulk("category")}
                  disabled={
                    loading ||
                    bulkBusy ||
                    importingId != null ||
                    removingId != null ||
                    categoryFilter === "all" ||
                    (selectedCategoryMeta?.pending ?? 0) === 0
                  }
                  title={
                    categoryFilter === "all"
                      ? "Elige una categoría para cargarla completa"
                      : undefined
                  }
                >
                  {bulkMode === "category" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {categoryFilter === "all"
                    ? "Cargar por categoría"
                    : bulkMode === "category"
                      ? `Cargando ${supplierCategoryLabel(categoryFilter)}…`
                      : `Cargar ${supplierCategoryLabel(categoryFilter)}${
                          selectedCategoryMeta
                            ? ` (${selectedCategoryMeta.pending})`
                            : ""
                        }`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {loading && products.length === 0 ? (
        <div className="flex items-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando catálogo mayorista…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-16 text-center dark:border-zinc-800">
          <Package
            className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Aún no hay productos disponibles
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando se publiquen nuevos productos, aparecerán aquí para añadirlos
            a tu tienda.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          {query.trim() || hasActiveFilters
            ? "No hay coincidencias con los filtros actuales."
            : "No hay productos en esta categoría."}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const isImporting = importingId === product.id;
            const isRemoving = removingId === product.id;
            const busy =
              importingId != null ||
              removingId != null ||
              bulkBusy ||
              applyingMargin;
            const draft = priceDrafts[product.id] ?? draftsFromProduct(product);
            const dirty = isPriceDirty(product, draft);
            const saving = Boolean(savingIds[product.id]);
            const selected = Boolean(selectedIds[product.id]);
            const retailParsed = parseUsdAmount(draft.retail, { min: 0 });
            const profitUsd =
              retailParsed != null
                ? retailParsed - product.wholesalePriceUsd
                : null;

            return (
              <li
                key={product.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-950",
                  selected
                    ? "border-teal-400 ring-2 ring-teal-400/20 dark:border-teal-600"
                    : "border-zinc-200/80 dark:border-zinc-800",
                )}
              >
                <SupplierCatalogCardMedia product={product} />

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-teal-700 focus:ring-teal-600"
                      checked={selected}
                      onChange={() => toggleSelected(product.id)}
                      aria-label={`Seleccionar ${product.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {product.title}
                      </p>
                      <p className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {supplierCategoryLabel(product.category)}
                      </p>
                      {product.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {product.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                          Costo mayorista
                        </span>
                        <span className="text-sm font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                          {formatUsd(product.wholesalePriceUsd)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-700/80">
                        <label className="space-y-1.5">
                          <span className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                            Precio de venta
                          </span>
                          <CatalogMoneyInput
                            prefix="$"
                            value={draft.retail}
                            disabled={saving || busy}
                            aria-label={`Precio de venta de ${product.title}`}
                            onChange={(value) => onRetailChange(product, value)}
                            onBlur={() => void persistPrice(product.id)}
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                            Ganancia %
                          </span>
                          <CatalogMoneyInput
                            suffix="%"
                            value={draft.marginPercent}
                            disabled={
                              saving || busy || product.wholesalePriceUsd <= 0
                            }
                            aria-label={`Ganancia de ${product.title}`}
                            onChange={(value) =>
                              onMarginPercentChange(product, value)
                            }
                            onBlur={() => void persistPrice(product.id)}
                          />
                        </label>
                      </div>

                      {profitUsd != null && profitUsd > 0 ? (
                        <p className="mt-2.5 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          +{formatUsd(profitUsd)} de ganancia por unidad
                        </p>
                      ) : null}
                    </div>

                    <div className="flex min-h-5 items-center gap-2">
                      {product.alreadyImported ? (
                        saving ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                            Guardando…
                          </span>
                        ) : dirty ? (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-amber-700 hover:underline dark:text-amber-400"
                            onClick={() => void persistPrice(product.id)}
                            disabled={busy}
                          >
                            Actualizar precio
                          </button>
                        ) : draft.retail ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Precio en tu vitrina
                          </span>
                        ) : null
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          Se aplicará al añadir a tu tienda
                        </span>
                      )}
                    </div>
                  </div>

                  {product.alreadyImported ? (
                    <div className="flex flex-col gap-2">
                      {product.imageUrl ? (
                        <SocialImageDownloadButton
                          imageUrl={product.imageUrl}
                          productTitle={product.title}
                        />
                      ) : null}
                      {product.linkedProductId || product.linkedProductSlug ? (
                        <CopyProductPublicLinkButton
                          storeSlug={storeSlug}
                          productSlug={
                            product.linkedProductSlug ??
                            product.linkedProductId ??
                            ""
                          }
                          customDomain={customDomain}
                          customDomainVerified={customDomainVerified}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        onClick={() => handleRemove(product.id)}
                        disabled={busy}
                      >
                        {isRemoving ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <X className="h-4 w-4" aria-hidden="true" />
                        )}
                        Quitar del catálogo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="btn-brand inline-flex min-h-10 items-center justify-center gap-2 !text-sm"
                        onClick={() => handleAdd(product.id)}
                        disabled={busy}
                      >
                        {isImporting ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <PackagePlus className="h-4 w-4" aria-hidden="true" />
                        )}
                        Añadir al catálogo de mi tienda
                      </button>
                      {product.imageUrl ? (
                        <SocialImageDownloadButton
                          imageUrl={product.imageUrl}
                          productTitle={product.title}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
