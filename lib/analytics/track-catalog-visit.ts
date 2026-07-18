import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";

export const CATALOG_VISITOR_COOKIE_PREFIX = "alcentimo_cv_";

export function getCatalogVisitorCookieName(storeSlug: string): string {
  return `${CATALOG_VISITOR_COOKIE_PREFIX}${storeSlug.trim().toLowerCase()}`;
}

/** Registra o actualiza una visita al catálogo (cookie anónima). */
export async function recordCatalogVisit(
  storeSlug: string,
  storeId: string,
  userId: string | null,
): Promise<void> {
  const cookieStore = await cookies();
  const visitorKey = cookieStore.get(getCatalogVisitorCookieName(storeSlug))?.value?.trim();

  if (!visitorKey) return;

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from("catalog_visits")
      .select("id, user_id, registered_at")
      .eq("store_id", storeId)
      .eq("visitor_key", visitorKey)
      .maybeSingle();

    if (existing) {
      await admin
        .from("catalog_visits")
        .update({
          last_seen_at: now,
          user_id: userId ?? existing.user_id,
        })
        .eq("id", existing.id);
      return;
    }

    await admin.from("catalog_visits").insert({
      store_id: storeId,
      visitor_key: visitorKey,
      user_id: userId,
      first_seen_at: now,
      last_seen_at: now,
    });
  } catch {
    // No bloquear la carga del catálogo si falla el tracking.
  }
}

/** Marca la visita actual como registrada tras crear customer_profiles. */
export async function markCatalogVisitRegistered(
  storeSlug: string,
  userId: string,
): Promise<void> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const cookieStore = await cookies();
  const visitorKey = cookieStore
    .get(getCatalogVisitorCookieName(normalizedSlug))
    ?.value?.trim();

  if (!visitorKey) return;

  try {
    const admin = createAdminClient();
    const store = await resolveActiveStoreBySlug(admin, normalizedSlug);
    if (!store) return;

    const now = new Date().toISOString();

    await admin.from("catalog_visits").upsert(
      {
        store_id: store.id,
        visitor_key: visitorKey,
        user_id: userId,
        registered_at: now,
        last_seen_at: now,
      },
      { onConflict: "store_id,visitor_key" },
    );
  } catch {
    // El registro del cliente no debe fallar por analytics.
  }
}
