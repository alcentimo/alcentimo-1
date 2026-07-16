import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreAnalytics } from "@/lib/analytics/get-store-analytics";
import { AnalyticsDashboard } from "@/components/dashboard/analytics/AnalyticsDashboard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function AnaliticasPage() {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/analiticas");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const analytics = await getStoreAnalytics(supabase, store.id, store.slug);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        title="Analíticas"
        description={`Tablero de control de ${store.name}: ventas, pedidos e inventario en tiempo real.`}
        storeSlug={store.slug}
      />

      <AnalyticsDashboard analytics={analytics} />
    </PageContainer>
  );
}
