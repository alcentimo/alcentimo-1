import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreCoupons } from "@/lib/coupons/actions";
import { getStorePromotions } from "@/lib/promotions/actions";
import { getStoreInventory } from "@/lib/inventory";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { getCatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { SettingsPanel } from "@/components/dashboard/settings/SettingsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getStoreLocations } from "@/lib/locations/get-store-locations";
import { resolveLocationLimit } from "@/lib/locations/limits";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import {
  getEffectivePlanIdForLimits,
  resolveProTrialStatus,
} from "@/lib/plans/trial";

export const dynamic = "force-dynamic";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/ajustes");
  }

  const { store, authUser } = session;

  let settingsConfig = defaultStoreSettingsConfig();
  let coupons: Awaited<ReturnType<typeof getStoreCoupons>> = [];
  let promotions: Awaited<ReturnType<typeof getStorePromotions>> = [];
  let products: { id: string; name: string; categoryName: string | null; thumbUrl: string | null }[] =
    [];
  let locations: Awaited<ReturnType<typeof getStoreLocations>> = [];
  let locationLimit: {
    maxAllowed: number;
    includedLocations: number;
    extraAuthorized: number;
    remainingSlots: number;
    extraLocationMonthlyUsd: number;
    planId: string;
    billableExtraCount?: number;
    monthlyExtraCostUsd?: number;
    nextBranchRequiresExtra?: boolean;
    nextBranchMonthlyCostUsd?: number;
  } | null = null;

  let designPreview: {
    store: NonNullable<typeof store>;
    exchangeRate: number | null;
    exchangeRateUpdatedAt: string | null;
    baseSettings: Awaited<ReturnType<typeof getCatalogPreviewSettings>>;
  } | null = null;

  if (store) {
    const [config, couponRows, promotionRows, inventory, exchangeRateRow, previewSettings, storeLocations, planSettings] =
      await Promise.all([
      getStoreSettingsConfig(store.id),
      getStoreCoupons(store.id),
      getStorePromotions(store.id),
      getStoreInventory(store.slug),
      getCurrentExchangeRate(),
      getCatalogPreviewSettings(store),
      getStoreLocations(store.id).catch(() => []),
      fetchPlanSettings().catch(() => null),
    ]);

    settingsConfig = config;
    coupons = couponRows;
    promotions = promotionRows;
    locations = storeLocations;
    products = inventory.products.map((product) => ({
      id: product.product_id,
      name: product.product_name,
      categoryName: product.category_name,
      thumbUrl: product.thumb_url,
    }));
    designPreview = {
      store,
      exchangeRate: exchangeRateRow?.rate ?? null,
      exchangeRateUpdatedAt: exchangeRateRow?.created_at ?? null,
      baseSettings: previewSettings,
    };

    const trial = resolveProTrialStatus(authUser.profile, authUser.planId);
    const effectivePlanId = getEffectivePlanIdForLimits(authUser.planId, trial);
    const limit = resolveLocationLimit({
      planId: effectivePlanId,
      extraAuthorized: authUser.profile?.extra_locations_authorized ?? 0,
      currentCount: storeLocations.length,
      settings: planSettings ?? undefined,
    });
    locationLimit = {
      maxAllowed: limit.maxAllowed,
      includedLocations: limit.includedLocations,
      extraAuthorized: limit.extraAuthorized,
      remainingSlots: limit.remainingSlots,
      extraLocationMonthlyUsd: limit.extraLocationMonthlyUsd,
      planId: effectivePlanId,
      billableExtraCount: limit.billableExtraCount,
      monthlyExtraCostUsd: limit.monthlyExtraCostUsd,
      nextBranchRequiresExtra: limit.nextBranchRequiresExtra,
      nextBranchMonthlyCostUsd: limit.nextBranchMonthlyCostUsd,
    };
  }

  return (
    <div className="settings-page-shell mx-auto max-w-6xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        sectionLabel="Administración"
        title="Configuración de Tienda"
        description={
          store
            ? `Cómo se ve tu negocio: marca, ubicación, pagos y horarios · ${store.name}.`
            : "Cómo se ve tu negocio: marca, ubicación, pagos y horarios."
        }
        storeSlug={store?.slug ?? null}
      />

      <SettingsPanel
        store={
          store
            ? {
                name: store.name,
                slug: store.slug,
                logo_url: store.logo_url,
                description: store.description,
                rubro_tienda: store.rubro_tienda ?? "ropa-moda",
                custom_domain: store.custom_domain ?? null,
                custom_domain_verified: Boolean(store.custom_domain_verified),
              }
            : null
        }
        initialCoupons={coupons}
        initialPromotions={promotions}
        products={products}
        initialConfig={settingsConfig}
        designPreview={designPreview}
        initialTab={tab}
        planId={session.authUser.planId}
        initialLocations={locations}
        locationLimit={locationLimit}
      />
    </div>
  );
}
