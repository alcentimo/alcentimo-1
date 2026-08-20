"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Search, Upload } from "lucide-react";
import {
  listAdminSupplierCatalogProducts,
  publishAdminSupplierProduct,
  setAdminSupplierWholesalePrice,
  unpublishAdminSupplierProduct,
  type AdminSupplierCatalogProduct,
} from "@/lib/admin/supplier-catalog-actions";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "draft" | "published";

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "draft", label: "Borradores" },
  { id: "published", label: "Publicados" },
  { id: "all", label: "Todos" },
];

export function AdminSupplierCatalogPanel() {
  const [products, setProducts] = useState<AdminSupplierCatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      const result = await listAdminSupplierCatalogProducts();
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const rows = result.products ?? [];
      setProducts(rows);
      setPriceDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            row.precioMayoristaUsd != null ? String(row.precioMayoristaUsd) : "",
          ]),
        ),
      );
    });
  }, []);

  const draftCount = useMemo(
    () => products.filter((item) => item.publicationStatus === "draft").length,
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (statusFilter !== "all" && product.publicationStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        product.title.toLowerCase().includes(q) ||
        product.supplierName.toLowerCase().includes(q) ||
        supplierCategoryLabel(product.category).toLowerCase().includes(q)
      );
    });
  }, [products, query, statusFilter]);

  function replaceProduct(next: AdminSupplierCatalogProduct) {
    setProducts((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
    setPriceDrafts((current) => ({
      ...current,
      [next.id]:
        next.precioMayoristaUsd != null ? String(next.precioMayoristaUsd) : "",
    }));
  }

  function handleSave(product: AdminSupplierCatalogProduct, publish: boolean) {
    const raw = priceDrafts[product.id] ?? "";
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setAdminSupplierWholesalePrice({
        productId: product.id,
        precioMayoristaUsd: raw,
        publish,
      });
      setBusyId(null);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo guardar el precio mayorista.");
        return;
      }
      replaceProduct(result.product);
      setMessage(
        publish
          ? `“${result.product.title}” publicado en el catálogo de dropshippers.`
          : `Precio mayorista actualizado para “${result.product.title}”.`,
      );
    });
  }

  function handlePublish(product: AdminSupplierCatalogProduct) {
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await publishAdminSupplierProduct(product.id);
      setBusyId(null);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo publicar el producto.");
        return;
      }
      replaceProduct(result.product);
      setMessage(`“${result.product.title}” ya es visible para dropshippers.`);
    });
  }

  function handleUnpublish(product: AdminSupplierCatalogProduct) {
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await unpublishAdminSupplierProduct(product.id);
      setBusyId(null);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo pasar a borrador.");
        return;
      }
      replaceProduct(result.product);
      setMessage(`“${result.product.title}” volvió a borrador.`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="admin-stores-toolbar">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Productos de proveedores
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Revisa el costo del proveedor, ingresa el precio mayorista y aprueba
            el producto para que aparezca en el catálogo de los dropshippers.
            Ellos nunca ven el costo interno.
          </p>
        </div>

        <div className="admin-stores-search">
          <Search className="admin-stores-search-icon" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por producto, proveedor o categoría"
            className="admin-stores-search-input"
          />
        </div>

        <div className="admin-stores-toolbar-meta">
          <div className="admin-stores-quick-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "admin-stores-chip",
                  statusFilter === filter.id && "admin-stores-chip-active",
                )}
              >
                {filter.label}
                {filter.id === "draft" && draftCount > 0 ? ` (${draftCount})` : ""}
              </button>
            ))}
          </div>
          <p className="admin-stores-result-count">
            {filtered.length} producto{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      {loading && products.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando productos de proveedores…
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          {query.trim()
            ? "No hay coincidencias."
            : statusFilter === "draft"
              ? "No hay productos pendientes de precio mayorista."
              : "No hay productos en este filtro."}
        </p>
      ) : (
        <div className="admin-stores-table-shell">
          <div className="admin-stores-table-scroll">
            <table className="admin-stores-table">
              <thead>
                <tr>
                  <th className="admin-stores-th">Producto</th>
                  <th className="admin-stores-th">Proveedor</th>
                  <th className="admin-stores-th">Costo proveedor</th>
                  <th className="admin-stores-th">Precio mayorista</th>
                  <th className="admin-stores-th">Margen</th>
                  <th className="admin-stores-th">Estado</th>
                  <th className="admin-stores-th">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const busy = busyId === product.id;
                  const draftPrice = priceDrafts[product.id] ?? "";
                  const parsed = Number(String(draftPrice).replace(",", "."));
                  const liveMargin =
                    Number.isFinite(parsed) && draftPrice.trim()
                      ? parsed - product.costoProveedorUsd
                      : product.marginUsd;
                  return (
                    <tr key={product.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="admin-stores-td">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {product.title}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {supplierCategoryLabel(product.category)} · Stock{" "}
                              {product.stock}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="admin-stores-td text-zinc-600 dark:text-zinc-300">
                        {product.supplierName}
                      </td>
                      <td className="admin-stores-td font-medium text-zinc-900 dark:text-zinc-50">
                        {formatUsd(product.costoProveedorUsd)}
                      </td>
                      <td className="admin-stores-td">
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-zinc-400">
                            $
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={draftPrice}
                            disabled={busy}
                            onChange={(event) =>
                              setPriceDrafts((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                            className="h-9 pl-6 text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="admin-stores-td">
                        {liveMargin == null ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              liveMargin < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            {formatUsd(liveMargin)}
                          </span>
                        )}
                      </td>
                      <td className="admin-stores-td">
                        {product.publicationStatus === "published" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                            Borrador
                          </span>
                        )}
                      </td>
                      <td className="admin-stores-td">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleSave(product, false)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Guardar"
                            )}
                          </Button>
                          {product.publicationStatus === "published" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleUnpublish(product)}
                            >
                              Borrador
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                product.precioMayoristaUsd != null &&
                                String(priceDrafts[product.id] ?? "") ===
                                  String(product.precioMayoristaUsd)
                                  ? handlePublish(product)
                                  : handleSave(product, true)
                              }
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="mr-1 h-3.5 w-3.5" />
                                  Aprobar y publicar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
