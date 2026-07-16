import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);
  const params = await searchParams;

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/catalogo");
  }

  if (params.tab === "ajustes") {
    redirect("/dashboard/ajustes");
  }

  const { store } = session;
  const showOnboardingSuccess = params.onboarded === "1";

  if (!store) {
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

  const [{ products }, exchangeRate, productFormConfig] = await Promise.all([
    getStoreInventory(store.slug),
    getCurrentExchangeRate(),
    getStoreProductFormConfig(store.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      {showOnboardingSuccess ? (
        <div className="alert-success mb-6" role="status">
          ¡Tu tienda está lista! Publica tu primer producto y comparte tu catálogo.
        </div>
      ) : null}

      <DashboardPageHeader
        sectionLabel="Inventario"
        title="Catálogo"
        description={`Productos, fotos, precios y stock de ${store.name}.`}
        storeSlug={store.slug}
      />

      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando catálogo…</p>}>
        <CatalogPanel
          store={store}
          exchangeRate={exchangeRate?.rate ?? null}
          initialProducts={products}
          productFormConfig={productFormConfig}
        />
      </Suspense>
    </div>
  );
}
