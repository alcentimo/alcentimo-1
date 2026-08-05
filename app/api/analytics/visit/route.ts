import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LANDING_VISITOR_COOKIE } from "@/lib/analytics/page-visit-keys";
import { getCatalogVisitorCookieName } from "@/lib/analytics/track-catalog-visit";
import {
  recordCatalogProductView,
  recordLandingPageVisit,
  recordStoreCatalogPageVisit,
} from "@/lib/analytics/record-page-visit";

export const dynamic = "force-dynamic";

type VisitBody = {
  type?: "landing" | "catalog" | "product";
  storeId?: string;
  storeSlug?: string;
  productId?: string;
  visitorKey?: string;
};

function newVisitorKey(): string {
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  let body: VisitBody = {};
  try {
    body = (await request.json()) as VisitBody;
  } catch {
    body = {};
  }

  const type = body.type ?? "landing";
  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  if (type === "landing") {
    let visitorKey =
      body.visitorKey?.trim() ||
      cookieStore.get(LANDING_VISITOR_COOKIE)?.value?.trim() ||
      "";

    if (!visitorKey || visitorKey.length < 8) {
      visitorKey = newVisitorKey();
      response.cookies.set(LANDING_VISITOR_COOKIE, visitorKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    await recordLandingPageVisit(visitorKey);
    return response;
  }

  if (type === "catalog") {
    const storeId = body.storeId?.trim();
    const storeSlug = body.storeSlug?.trim().toLowerCase();
    if (!storeId || !storeSlug) {
      return NextResponse.json(
        { error: "storeId/storeSlug requeridos" },
        { status: 400 },
      );
    }

    const cookieName = getCatalogVisitorCookieName(storeSlug);
    let visitorKey =
      body.visitorKey?.trim() ||
      cookieStore.get(cookieName)?.value?.trim() ||
      "";

    if (!visitorKey || visitorKey.length < 8) {
      visitorKey = newVisitorKey();
      response.cookies.set(cookieName, visitorKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: `/c/${storeSlug}`,
      });
    }

    await recordStoreCatalogPageVisit({ storeId, visitorKey });
    return response;
  }

  if (type === "product") {
    const storeId = body.storeId?.trim();
    const storeSlug = body.storeSlug?.trim().toLowerCase();
    const productId = body.productId?.trim();
    if (!storeId || !storeSlug || !productId) {
      return NextResponse.json(
        { error: "storeId/storeSlug/productId requeridos" },
        { status: 400 },
      );
    }

    const cookieName = getCatalogVisitorCookieName(storeSlug);
    const visitorKey =
      body.visitorKey?.trim() ||
      cookieStore.get(cookieName)?.value?.trim() ||
      "";

    if (!visitorKey || visitorKey.length < 8) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await recordCatalogProductView({ storeId, productId, visitorKey });
    return response;
  }

  return NextResponse.json({ error: "type inválido" }, { status: 400 });
}
