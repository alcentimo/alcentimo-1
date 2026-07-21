import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { AnalyticsPanel } from "@/components/dashboard/analytics/AnalyticsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function AnaliticasPage() {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/analiticas");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const analytics = await getStoreAnalyticsPanel(supabase, store.id, store.slug);

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        title="Analíticas"
        description={`Ventas, productos estrella y conversión de ${store.name}.`}
        storeSlug={store.slug}
      />

      <AnalyticsPanel analytics={analytics} />
    </PageContainer>
  );
}
