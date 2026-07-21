import { NextResponse } from "next/server";
import { loadDashboardRoutePrefetchData } from "@/lib/dashboard/load-route-data";
import { isDashboardPrefetchRoute } from "@/lib/dashboard/prefetch-routes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const route = new URL(request.url).searchParams.get("route");

  if (!isDashboardPrefetchRoute(route)) {
    return NextResponse.json({ error: "Ruta no válida." }, { status: 400 });
  }

  try {
    const payload = await loadDashboardRoutePrefetchData(route);

    if (!payload) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al precargar la ruta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
