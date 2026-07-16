import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getStoreInventory } from "@/lib/inventory";
import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreCoupons } from "@/lib/coupons/actions";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { PublicCatalogQuickLink } from "@/components/dashboard/PublicCatalogQuickLink";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; onboarded?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);
  const params = await searchParams;

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/catalogo");
  }

  const { store } = session;
  const showOnboardingSuccess = params.onboarded === "1";
  const initialTab =
    params.tab === "ajustes" ? ("ajustes" as const) : ("inventario" as const);

  if (!store) {
    return (
      <div className="mx-auto max-w-2xl">
        <header className="page-header">
          <p className="section-label">Catálogo</p>
          <h1 className="page-header-title">Tu vitrina</h1>
          <p className="page-header-desc">
            Crea tu tienda para gestionar productos y ajustes desde un solo lugar.
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

  const [
    { products },
    exchangeRate,
    productFormConfig,
    settingsConfig,
    coupons,
  ] = await Promise.all([
    getStoreInventory(store.slug),
    getCurrentExchangeRate(),
    getStoreProductFormConfig(store.id),
    getStoreSettingsConfig(supabase, store.id),
    getStoreCoupons(store.id),
  ]);

  const couponProducts = products.map((product) => ({
    id: product.product_id,
    name: product.product_name,
    categoryName: product.category_name,
    thumbUrl: product.thumb_url,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      {showOnboardingSuccess ? (
        <div className="alert-success mb-6" role="status">
          ¡Tu tienda está lista! Publica tu primer producto y comparte tu catálogo.
        </div>
      ) : null}

      <header className="page-header">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-label">Centro de trabajo</p>
            <h1 className="page-header-title">Catálogo</h1>
            <p className="page-header-desc">
              Gestiona inventario y configuración de {store.name}.
            </p>
          </div>
          <PublicCatalogQuickLink
            storeSlug={store.slug}
            className="mx-0 w-full shrink-0 sm:w-auto sm:min-w-[12rem]"
          />
        </div>
      </header>

      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando catálogo…</p>}>
        <CatalogPanel
          store={store}
          exchangeRate={exchangeRate?.rate ?? null}
          initialProducts={products}
          productFormConfig={productFormConfig}
          settingsStore={{
            name: store.name,
            slug: store.slug,
            logo_url: store.logo_url,
            description: store.description,
            rubro_tienda: store.rubro_tienda ?? "general",
          }}
          initialCoupons={coupons}
          couponProducts={couponProducts}
          initialConfig={settingsConfig ?? defaultStoreSettingsConfig()}
          autoOpenCreate={params.nuevo === "1"}
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
