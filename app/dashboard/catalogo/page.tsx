import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { getOnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { createClient } from "@/lib/supabase/server";
import { listPendingInventorySuggestions } from "@/lib/inventory-ai/run-scan";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { InventoryListSkeleton } from "@/components/dashboard/InventoryListSkeleton";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogPublicLinkMenu } from "@/components/dashboard/CatalogPublicLinkMenu";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{
    onboarded?: string;
    tab?: string;
  }>;
}) {
  const session = await getDashboardSession();
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
            Crea tu tienda para conectar productos del catálogo mayorista.
          </p>
        </header>
        <div className="card-panel">
          <Link href="/onboarding">
            <Button className="btn-brand">Configurar mi tienda</Button>
          </Link>
        </div>
      </div>
    );
  }

  let productLimitContext: Awaited<
    ReturnType<typeof getStoreProductLimitContext>
  >;
  let storeSettings: Awaited<ReturnType<typeof getStoreSettingsConfig>>;
  let inventorySuggestions: Awaited<
    ReturnType<typeof listPendingInventorySuggestions>
  >;

  try {
    [productLimitContext, storeSettings, inventorySuggestions] =
      await Promise.all([
        getStoreProductLimitContext(store.id),
        getStoreSettingsConfig(store.id),
        (async () => {
          try {
            const supabase = await createClient();
            return await listPendingInventorySuggestions(supabase, store.id);
          } catch {
            return [];
          }
        })(),
      ]);
  } catch (error) {
    console.error("[dashboard/catalogo] initial load failed", error);
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          El catálogo tarda en responder
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No pudimos completar la carga inicial. Reintenta; tu sesión sigue
          activa.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard/catalogo" className="btn-primary">
            Reintentar
          </Link>
          <Link href="/dashboard/login" className="btn-brand-outline">
            Volver al acceso
          </Link>
        </div>
      </div>
    );
  }

  const setupStatus = getOnboardingSetupStatus(
    productLimitContext?.currentCount ?? 0,
    storeSettings,
    store.slug,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Catálogo"
        description="Conecta productos del hub mayorista. Tu vitrina pública solo muestra lo que selecciones aquí."
        actions={
          <CatalogPublicLinkMenu
            storeSlug={store.slug}
            customDomain={store.custom_domain}
            customDomainVerified={Boolean(store.custom_domain_verified)}
          />
        }
      />

      <Suspense
        fallback={
          <InventoryListSkeleton rows={5} showReorderColumn={false} />
        }
      >
        <CatalogPanel
          store={store}
          productLimitContext={productLimitContext}
          setupStatus={setupStatus}
          showWelcomeFromUrl={showOnboardingSuccess}
          inventorySuggestions={inventorySuggestions}
        />
      </Suspense>
    </div>
  );
}
