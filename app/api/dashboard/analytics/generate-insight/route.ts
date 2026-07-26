import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateAnalyticsInsight } from "@/lib/ai/generate-analytics-insight";
import { getStoreAnalyticsPanel } from "@/lib/analytics/get-store-analytics";
import {
  formatMetricChangeCompact,
  summarizeBusiestDays,
  summarizeTopProduct,
} from "@/lib/analytics/summarize-sales-trend";
import { isStoreOwner } from "@/lib/stores/owner-access";

export const dynamic = "force-dynamic";

interface GenerateAnalyticsInsightRequestBody {
  range?: string | null;
  from?: string | null;
  to?: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  if (!isStoreOwner(auth.store, auth.authUser.id)) {
    return NextResponse.json(
      { error: "Solo el dueño de la tienda puede ver el análisis inteligente." },
      { status: 403 },
    );
  }

  let body: GenerateAnalyticsInsightRequestBody;
  try {
    body = (await request.json()) as GenerateAnalyticsInsightRequestBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const analytics = await getStoreAnalyticsPanel(
      supabase,
      auth.store.id,
      auth.store.slug,
      {
        range: body.range,
        from: body.from,
        to: body.to,
      },
    );

    const { financialKpis, trafficMetrics, salesTrend, topProductsByRevenue, stagnantProducts } =
      analytics;

    const conversionDescription = trafficMetrics.trackingEnabled
      ? `Conv ${trafficMetrics.conversionRatePct.value.toFixed(1)}% (${formatMetricChangeCompact(trafficMetrics.conversionRatePct)})`
      : "Sin datos tráfico";

    const result = await generateAnalyticsInsight({
      storeName: auth.store.name,
      periodLabel: analytics.dateRange.label,
      periodSalesUsd: financialKpis.periodSalesUsd.value,
      salesChangeDescription: formatMetricChangeCompact(
        financialKpis.periodSalesUsd,
      ),
      transactionCount: Math.round(financialKpis.transactionCount.value),
      transactionsChangeDescription: formatMetricChangeCompact(
        financialKpis.transactionCount,
      ),
      averageOrderValueUsd: financialKpis.averageOrderValueUsd.value,
      averageTicketChangeDescription: formatMetricChangeCompact(
        financialKpis.averageOrderValueUsd,
      ),
      busiestDaysDescription: summarizeBusiestDays(salesTrend),
      topProductDescription: summarizeTopProduct(topProductsByRevenue),
      stagnantProductCount: stagnantProducts.length,
      conversionRateDescription: conversionDescription,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al generar el análisis.";
    const status =
      message.includes("OPENAI") || message.includes("OpenAI") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
