import { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { createClient } from "@/lib/supabase/server";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import { AnalyticsPanel } from "@/components/dashboard/analytics/AnalyticsPanel";
import { CatalogVisitStatsCard } from "@/components/dashboard/CatalogVisitStatsCard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getCatalogVisitStats } from "@/lib/analytics/get-page-visit-stats";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorAnaliticasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { store } = await requireSupplierHubSession({
    requireOwnStorefront: true,
  });
  if (!store) {
    return (
      <PageContainer as="div" className="py-6 sm:py-8">
        <p className="text-sm text-zinc-500">Preparando analíticas…</p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
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
    <PageContainer as="div" className="py-6 sm:py-8">
      <DashboardPageHeader
        title="Analíticas"
        description={`Rendimiento de tu vitrina ${store.name}.`}
      />
      <Suspense fallback={null}>
        <CatalogVisitStatsCard stats={catalogVisitStats} />
      </Suspense>
      <AnalyticsPanel analytics={analytics} />
    </PageContainer>
  );
}
