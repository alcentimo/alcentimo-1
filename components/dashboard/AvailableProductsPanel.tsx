"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Check,
  FolderPlus,
  Loader2,
  Package,
  PackagePlus,
  Search,
  X,
} from "lucide-react";
import {
  importSupplierProductToStoreCatalog,
  listActiveSupplierCatalogForMerchant,
  removeSupplierProductFromStoreCatalog,
  type MerchantSupplierCatalogProduct,
} from "@/lib/dropship/actions";
import { importSupplierProductsBulkToStore } from "@/lib/dropship/bulk-import";
import { SocialImageDownloadButton } from "@/components/dashboard/SocialImageDownloadButton";
import { formatUsd } from "@/lib/format";
import {
  SUPPLIER_PRODUCT_CATEGORIES,
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import { cn } from "@/lib/cn";

type CategoryFilter = "all" | SupplierProductCategory;
type BulkMode = "all" | "category" | null;

function catalogImageUrls(product: MerchantSupplierCatalogProduct): string[] {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls;
  }
  return product.imageUrl ? [product.imageUrl] : [];
}

function SupplierCatalogCardMedia({
  product,
}: {
  product: MerchantSupplierCatalogProduct;
}) {
  const urls = catalogImageUrls(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = urls[activeIndex] ?? urls[0] ?? null;

  return (
    <div className="relative aspect-[4/3] bg-zinc-50 dark:bg-zinc-900">
      {activeUrl ? (
        <Image
          src={activeUrl}
          alt={product.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-300 dark:text-zinc-600">
          <Package className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
      {urls.length > 1 ? (
        <div className="absolute inset-x-0 bottom-0 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-black/55 to-transparent px-2 pb-2 pt-6">
          {urls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              className={cn(
                "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-2 ring-white/20",
                index === activeIndex && "ring-white",
              )}
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver foto ${index + 1} de ${urls.length}`}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface AvailableProductsPanelProps {
  onImported?: (productId: string) => void;
  className?: string;
}

export function AvailableProductsPanel({
  onImported,
  className,
}: AvailableProductsPanelProps) {
  const [products, setProducts] = useState<MerchantSupplierCatalogProduct[]>(
    [],
  );
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [, startTransition] = useTransition();

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
      setProducts(result.products ?? []);
    });
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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

  function markImported(supplierIds: string[]) {
    const imported = new Set(supplierIds);
    setProducts((prev) =>
      prev.map((product) =>
        imported.has(product.id)
          ? {
              ...product,
              alreadyImported: true,
            }
          : product,
      ),
    );
  }

  function handleBulk(mode: Exclude<BulkMode, null>) {
    if (mode === "category" && categoryFilter === "all") return;
    setBulkMode(mode);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await importSupplierProductsBulkToStore(
        mode === "category" ? { category: categoryFilter } : {},
      );
      setBulkMode(null);
      if (result.error) {
        setError(result.error);
        if (result.importedSupplierIds?.length) {
          markImported(result.importedSupplierIds);
          onImported?.(result.importedSupplierIds[0]);
        }
        return;
      }
      if (result.importedSupplierIds?.length) {
        markImported(result.importedSupplierIds);
        onImported?.(result.importedSupplierIds[0]);
      }
      setMessage(result.message ?? "Productos añadidos a tu tienda.");
    });
  }

  function handleAdd(productId: string) {
    setImportingId(productId);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await importSupplierProductToStoreCatalog(productId);
      setImportingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.ok && result.productId) {
        const linkedProductId = result.productId;
        setMessage(`“${result.productName}” añadido al catálogo de tu tienda.`);
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  alreadyImported: true,
                  linkedProductId,
                }
              : product,
          ),
        );
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
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? {
                ...product,
                alreadyImported: false,
                linkedProductId: null,
              }
            : product,
        ),
      );
      onImported?.(productId);
    });
  }

  const bulkBusy = bulkMode != null;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Catálogo mayorista
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Selecciona productos del hub de proveedores. Solo lo que añadas aquí
            aparece en la vitrina pública de tu tienda — sin inventario manual.
            Las fotos ya vienen optimizadas: descárgalas listas para Instagram,
            Facebook o WhatsApp.
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

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          className="input-field !pl-9"
          placeholder="Buscar en el catálogo mayorista…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar productos mayoristas"
        />
      </div>

      {categoryFacets.length > 0 ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filtrar por categoría"
          >
            <button
              type="button"
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                categoryFilter === "all"
                  ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
              )}
              onClick={() => setCategoryFilter("all")}
            >
              Todas
              <span className="ml-1 tabular-nums text-zinc-400">
                {products.length}
              </span>
            </button>
            {categoryFacets.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  categoryFilter === item.value
                    ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
                )}
                onClick={() => setCategoryFilter(item.value)}
              >
                {item.label}
                <span className="ml-1 tabular-nums text-zinc-400">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-brand-outline inline-flex min-h-10 shrink-0 items-center justify-center gap-2 !text-sm"
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
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
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
      ) : null}

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
            Aún no hay productos publicados por proveedores
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando publiquen en el hub, aparecerán aquí para añadirlos a tu
            tienda.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          {query.trim()
            ? `No hay coincidencias para “${query.trim()}”.`
            : "No hay productos en esta categoría."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const isImporting = importingId === product.id;
            const isRemoving = removingId === product.id;
            const busy =
              importingId != null || removingId != null || bulkBusy;

            return (
              <li
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <SupplierCatalogCardMedia product={product} />

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {product.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {supplierCategoryLabel(product.category)}
                    </p>
                    {product.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                        {product.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-auto">
                    {product.suggestedRetailUsd != null ? (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatUsd(product.suggestedRetailUsd)}
                        <span className="ml-1 text-xs font-normal text-zinc-500">
                          precio en tu tienda
                        </span>
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-500">Precio al añadir</p>
                    )}
                  </div>

                  {product.alreadyImported ? (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        En el catálogo de tu tienda
                      </span>
                      {product.imageUrl ? (
                        <SocialImageDownloadButton
                          imageUrl={product.imageUrl}
                          productTitle={product.title}
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
