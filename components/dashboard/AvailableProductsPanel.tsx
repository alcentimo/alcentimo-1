"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Package, PackagePlus, Search } from "lucide-react";
import {
  importSupplierProductToStoreCatalog,
  listActiveSupplierCatalogForMerchant,
  type MerchantSupplierCatalogProduct,
} from "@/lib/dropship/actions";
import { formatUsd } from "@/lib/format";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import { cn } from "@/lib/cn";

interface AvailableProductsPanelProps {
  /** Se llama tras añadir un producto (p. ej. refrescar “Mi tienda”). */
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => {
      const category = supplierCategoryLabel(product.category).toLowerCase();
      return (
        product.title.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        category.includes(q)
      );
    });
  }, [products, query]);

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
        setMessage(`“${result.productName}” ya está en tu tienda.`);
        setProducts((prev) =>
          prev.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  alreadyImported: true,
                  linkedProductId: result.productId,
                }
              : product,
          ),
        );
        onImported?.(result.productId);
      }
    });
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Productos disponibles
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Elige del catálogo y añádelos a tu tienda en un clic. Fotos, nombre y
          descripción se copian solos — sin inventarios complicados.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          className="input-field !pl-9"
          placeholder="Buscar productos…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar productos disponibles"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {loading && products.length === 0 ? (
        <div className="flex items-center gap-2 py-16 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando productos…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-16 text-center dark:border-zinc-800">
          <Package
            className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Aún no hay productos para añadir
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Cuando el catálogo esté listo, aparecerán aquí.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No hay coincidencias para “{query.trim()}”.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const isImporting = importingId === product.id;
            const busy = importingId != null;

            return (
              <li
                key={product.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="relative aspect-[4/3] bg-zinc-50 dark:bg-zinc-900">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
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
                </div>

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
                    <span className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Ya en tu tienda
                    </span>
                  ) : (
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
                      Añadir a mi tienda
                    </button>
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
