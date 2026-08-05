import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { AnalyticsPanel } from "@/components/dashboard/analytics/AnalyticsPanel";
import { CatalogVisitStatsCard } from "@/components/dashboard/CatalogVisitStatsCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getCatalogVisitStats } from "@/lib/analytics/get-page-visit-stats";

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
  const [analytics, catalogVisitStats] = await Promise.all([
    getStoreAnalyticsPanel(supabase, store.id, store.slug, {
      range: params.range,
      from: params.from,
      to: params.to,
    }),
    getCatalogVisitStats(supabase, store.id).catch(() => ({
      todayUniqueVisitors: 0,
      monthUniqueVisitors: 0,
      totalUniqueVisitors: 0,
      todayPageViews: 0,
      monthPageViews: 0,
      totalPageViews: 0,
      topProduct: null,
    })),
  ]);

  return (
    <PageContainer as="div" className="space-y-6 py-6 sm:py-8">
      <DashboardPageHeader
        title="Analíticas"
        description={`Rendimiento comercial, tráfico y productos de ${store.name}.`}
      />

      <CatalogVisitStatsCard stats={catalogVisitStats} />

      <Suspense fallback={<div className="analytics-range-picker-loading">Cargando métricas…</div>}>
        <AnalyticsPanel analytics={analytics} />
      </Suspense>
    </PageContainer>
  );
}
