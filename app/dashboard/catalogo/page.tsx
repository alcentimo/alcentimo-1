import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { createClient } from "@/lib/supabase/server";
import { listPendingInventorySuggestions } from "@/lib/inventory-ai/run-scan";
import { CatalogPanel } from "@/components/dashboard/CatalogPanel";
import { InventoryListSkeleton } from "@/components/dashboard/InventoryListSkeleton";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { CatalogPublicLinkMenu } from "@/components/dashboard/CatalogPublicLinkMenu";
import { ensureDefaultMerchantStore } from "@/lib/stores/ensure-default-merchant-store";
import { userHasSupplierOwnStorefront } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  if (await userHasSupplierOwnStorefront(session.authUser.id)) {
    redirect("/proveedor/dashboard/catalogo");
  }

  if (params.tab === "ajustes") {
    redirect("/dashboard/ajustes");
  }

  const showOnboardingSuccess = params.onboarded === "1";

  let { store } = session;
  if (!store) {
    try {
      const supabase = await createClient();
      const user = await getOptionalAuthUser(supabase);
      if (user) {
        store = await ensureDefaultMerchantStore(supabase, user);
      }
    } catch (error) {
      console.error("[dashboard/catalogo] default store", error);
    }
  }

  if (!store) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          No pudimos abrir tu tienda
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Recarga la página. Si el problema continúa, entra de nuevo a tu
          cuenta.
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

  let productLimitContext: Awaited<
    ReturnType<typeof getStoreProductLimitContext>
  >;
  let inventorySuggestions: Awaited<
    ReturnType<typeof listPendingInventorySuggestions>
  >;

  try {
    [productLimitContext, inventorySuggestions] =
      await Promise.all([
        getStoreProductLimitContext(store.id),
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
          showWelcomeFromUrl={showOnboardingSuccess}
          inventorySuggestions={inventorySuggestions}
        />
      </Suspense>
    </div>
  );
}
