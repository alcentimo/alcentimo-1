import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { PromotionsPanel } from "@/components/dashboard/promotions/PromotionsPanel";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreCoupons } from "@/lib/coupons/actions";
import { getStorePromotions } from "@/lib/promotions/actions";
import { getStoreInventory } from "@/lib/inventory";
import { requireDashboardRouteAccess } from "@/lib/team/route-guard";
import { listPendingMarketingSuggestions } from "@/lib/marketing-ai/run-scan";

export const dynamic = "force-dynamic";

export default async function PromocionesPage() {
  await requireDashboardRouteAccess("/dashboard/promociones");

  const session = await getDashboardSession();
  if (!session) {
    redirect("/dashboard/login?next=/dashboard/promociones");
  }

  const { store } = session;
  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const supabase = await createClient();
  const [coupons, promotions, inventory, aiSuggestions] = await Promise.all([
    getStoreCoupons(store.id),
    getStorePromotions(store.id),
    getStoreInventory(store.slug),
    listPendingMarketingSuggestions(supabase, store.id).catch(() => []),
  ]);

  const products = inventory.products.map((product) => ({
    id: product.product_id,
    name: product.product_name,
    categoryName: product.category_name ?? null,
    thumbUrl: product.thumb_url ?? null,
  }));

  return (
    <PageContainer as="div" className="space-y-6 py-6 sm:py-8">
      <DashboardPageHeader
        title="Promociones"
        description="Crea cupones y promociones manualmente, o activa las recomendaciones de la IA según el rendimiento de tu tienda."
      />
      <PromotionsPanel
        initialCoupons={coupons}
        initialPromotions={promotions}
        products={products}
        initialAiSuggestions={aiSuggestions}
      />
    </PageContainer>
  );
}
