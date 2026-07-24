import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { AnalyticsPanel } from "@/components/dashboard/analytics/AnalyticsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function AnaliticasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login?next=/dashboard/analiticas");
  }

  const { store } = session;

  if (!store) {
    redirect("/dashboard/productos/nuevo");
  }

  const params = await searchParams;
  const analytics = await getStoreAnalyticsPanel(supabase, store.id, store.slug, {
    range: params.range,
    from: params.from,
    to: params.to,
  });

  return (
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        title="Analíticas"
        description={`Rendimiento comercial, tráfico y productos de ${store.name}.`}
      />

      <Suspense fallback={<div className="analytics-range-picker-loading">Cargando métricas…</div>}>
        <AnalyticsPanel analytics={analytics} />
      </Suspense>
    </PageContainer>
  );
}
