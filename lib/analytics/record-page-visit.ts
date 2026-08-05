import { createAdminClient } from "@/lib/supabase/admin";
import {
  LANDING_PAGE_TARGET_KEY,
  storePageVisitTargetKey,
} from "@/lib/analytics/page-visit-keys";

/** Registra visita única por sesión (landing o catálogo) vía RPC. */
export async function recordPageVisit(input: {
  targetKey: string;
  storeId?: string | null;
  visitorKey: string;
}): Promise<void> {
  const visitorKey = input.visitorKey.trim();
  if (visitorKey.length < 8) return;

  const targetKey = input.targetKey.trim();
  if (!targetKey) return;

  try {
    const admin = createAdminClient();
    await admin.rpc("record_page_visit", {
      p_target_key: targetKey,
      p_store_id:
        targetKey === LANDING_PAGE_TARGET_KEY
          ? null
          : (input.storeId ?? null),
      p_visitor_key: visitorKey,
    });
  } catch {
    // No bloquear la UX si falla analytics.
  }
}

export async function recordLandingPageVisit(visitorKey: string): Promise<void> {
  await recordPageVisit({
    targetKey: LANDING_PAGE_TARGET_KEY,
    storeId: null,
    visitorKey,
  });
}

export async function recordStoreCatalogPageVisit(input: {
  storeId: string;
  visitorKey: string;
}): Promise<void> {
  await recordPageVisit({
    targetKey: storePageVisitTargetKey(input.storeId),
    storeId: input.storeId,
    visitorKey: input.visitorKey,
  });
}

export async function recordCatalogProductView(input: {
  storeId: string;
  productId: string;
  visitorKey: string;
}): Promise<void> {
  const visitorKey = input.visitorKey.trim();
  if (visitorKey.length < 8) return;

  try {
    const admin = createAdminClient();
    await admin.rpc("record_catalog_product_view", {
      p_store_id: input.storeId,
      p_product_id: input.productId,
      p_visitor_key: visitorKey,
    });
  } catch {
    // No bloquear la UX.
  }
}
