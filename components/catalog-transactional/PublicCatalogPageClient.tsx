"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { TransactionalCatalog } from "@/components/catalog-transactional/TransactionalCatalog";
import { CatalogStoreIdentityHeader } from "@/components/catalog-transactional/CatalogStoreIdentityHeader";
import { fetchPublicCatalogPageBootstrap } from "@/lib/catalog/fetch-public-catalog-bootstrap";
import type { PublicCatalogPageData } from "@/lib/catalog/get-public-catalog-page-data";

/**
 * Catálogo público en cliente: estructura visual al instante,
 * datos de tienda/productos en useEffect.
 */
export function PublicCatalogPageClient() {
  const params = useParams<{ store_slug: string }>();
  const searchParams = useSearchParams();
  const storeSlug = String(params.store_slug ?? "").trim().toLowerCase();

  const openCheckoutInitially = searchParams.get("checkout") === "1";
  const openCartInitially = searchParams.get("carrito") === "1";
  const initialProductId = searchParams.get("product")?.trim() || null;

  const [data, setData] = useState<PublicCatalogPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!storeSlug) {
      setMissing(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPublicCatalogPageBootstrap(storeSlug).then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        if (result.code === "not_found") {
          setMissing(true);
        } else {
          setError(result.error);
        }
        setLoading(false);
        return;
      }

      setData(result.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [storeSlug]);

  if (missing) {
    notFound();
  }

  if (error && !data) {
    return (
      <div className="txn-catalog space-y-4 px-1 py-2">
        <CatalogStoreIdentityHeader
          storeName={storeSlug.replace(/-/g, " ")}
          eyebrow="Catálogo"
        />
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {error}
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="txn-catalog space-y-4 px-1 py-2">
        <CatalogStoreIdentityHeader
          storeName={storeSlug ? storeSlug.replace(/-/g, " ") : "Catálogo"}
          eyebrow="Catálogo"
        />
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando productos…
        </div>
      </div>
    );
  }

  return (
    <TransactionalCatalog
      store={data.store}
      products={data.products}
      storeCategories={data.storeCategories}
      exchangeRate={data.exchangeRate}
      purchaseInfo={data.purchaseInfo}
      catalogDesign={data.catalogDesign}
      catalogCurrency={data.catalogCurrency}
      openCheckoutInitially={openCheckoutInitially}
      openCartInitially={openCartInitially}
      initialProductId={initialProductId}
      locations={data.locations}
      locationStocks={data.locationStocks}
      catalogTotalCount={data.totalCount}
      enableServerPagination
    />
  );
}
