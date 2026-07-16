import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreCoupons } from "@/lib/coupons/actions";
import { getStoreInventory } from "@/lib/inventory";
import { SettingsPanel } from "@/components/dashboard/settings/SettingsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/ajustes");
  }

  const { store } = session;

  let settingsConfig = defaultStoreSettingsConfig();
  let coupons: Awaited<ReturnType<typeof getStoreCoupons>> = [];
  let products: { id: string; name: string; categoryName: string | null; thumbUrl: string | null }[] =
    [];

  if (store) {
    const [config, couponRows, inventory] = await Promise.all([
      getStoreSettingsConfig(supabase, store.id),
      getStoreCoupons(store.id),
      getStoreInventory(store.slug),
    ]);

    settingsConfig = config;
    coupons = couponRows;
    products = inventory.products.map((product) => ({
      id: product.product_id,
      name: product.product_name,
      categoryName: product.category_name,
      thumbUrl: product.thumb_url,
    }));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <DashboardPageHeader
        sectionLabel="Administración"
        title="Configuración de Tienda"
        description={
          store
            ? `Marca, ubicación, horarios, pagos y promociones · ${store.name}.`
            : "Marca, ubicación, horarios, pagos y promociones."
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
                rubro_tienda: store.rubro_tienda ?? "general",
              }
            : null
        }
        initialCoupons={coupons}
        products={products}
        initialConfig={settingsConfig}
      />
    </div>
  );
}
