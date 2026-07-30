"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogPublicLinkMenu } from "@/components/dashboard/CatalogPublicLinkMenu";
import { Button } from "@/components/ui/button";
import { fetchCatalogPageBootstrap } from "@/lib/catalog/fetch-catalog-page-bootstrap";
import { sanitizeInventorySearch } from "@/lib/inventory/search";
import { parseInventoryPageSize } from "@/lib/inventory/constants";
import { parseCatalogStockFilter } from "@/lib/inventory/stock-status";
import type { CatalogPageBootstrap } from "@/lib/catalog/fetch-catalog-page-bootstrap";

type ReadyBootstrap = Extract<CatalogPageBootstrap, { ok: true }>;

/**
 * Página de catálogo 100% cliente: título inmediato, datos en useEffect.
 */
export function CatalogoPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [boot, setBoot] = useState<ReadyBootstrap | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [noStore, setNoStore] = useState(false);
  const [loading, setLoading] = useState(true);

  const stockFilter = parseCatalogStockFilter(searchParams.get("stock") ?? undefined);
  const searchQuery = sanitizeInventorySearch(searchParams.get("q") ?? "");
  const pageSize = parseInventoryPageSize(searchParams.get("per") ?? undefined);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const showWelcomeFromUrl = searchParams.get("onboarded") === "1";

  useEffect(() => {
    if (searchParams.get("tab") !== "ajustes") return;
    router.replace("/dashboard/ajustes");
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBootError(null);

    void fetchCatalogPageBootstrap().then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        if (result.code === "unauth") {
          router.replace("/dashboard/login?next=/dashboard/catalogo");
          return;
        }
        if (result.code === "no_store") {
          setNoStore(true);
          setLoading(false);
          return;
        }
        setBootError(result.error);
        setLoading(false);
        return;
      }

      setBoot(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (noStore) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="page-header">
          <p className="section-label">Catálogo</p>
          <h1 className="page-header-title">Tu vitrina</h1>
          <p className="page-header-desc">
            Crea tu tienda para gestionar productos desde un solo lugar.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/dashboard/productos/nuevo">
            <Button className="btn-brand">Configurar mi tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Catálogo"
        description={
          boot
            ? `Gestiona lo que vendes: productos, fotos, precios y stock de ${boot.store.name}.`
            : "Gestiona lo que vendes: productos, fotos, precios y stock."
        }
        actions={
          boot ? (
            <CatalogPublicLinkMenu
              storeSlug={boot.store.slug}
              customDomain={boot.store.custom_domain}
              customDomainVerified={Boolean(boot.store.custom_domain_verified)}
            />
          ) : null
        }
      />

      {bootError ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {bootError}
        </p>
      ) : null}

      {loading && !boot ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando catálogo…
        </div>
      ) : null}

      {boot ? (
        <CatalogPanel
          store={boot.store}
          exchangeRate={boot.exchangeRate}
          exchangeRateUpdatedAt={boot.exchangeRateUpdatedAt}
          initialProducts={[]}
          initialTotalCount={0}
          initialCriticalStockCount={boot.criticalStockCount}
          productFormConfig={boot.productFormConfig}
          previewSettings={boot.previewSettings}
          productLimitContext={boot.productLimitContext}
          initialStockFilter={stockFilter}
          initialSearchQuery={searchQuery}
          initialPage={page}
          initialPageSize={pageSize}
          rubroLabel={boot.rubroLabel}
          setupStatus={boot.setupStatus}
          showWelcomeFromUrl={showWelcomeFromUrl}
          loadOnMount
        />
      ) : null}
    </div>
  );
}
