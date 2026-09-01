import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";

export async function isPlatformAdminOwnedStore(
  storeId: string,
  ownerId?: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  let resolvedOwnerId = ownerId?.trim() || null;

  if (!resolvedOwnerId) {
    const { data: store, error } = await admin
      .from("stores")
      .select("owner_id")
      .eq("id", storeId)
      .maybeSingle();
    if (error || !store) return false;
    resolvedOwnerId = String(
      (store as { owner_id: string }).owner_id ?? "",
    ).trim();
  }

  if (!resolvedOwnerId) return false;

  try {
    const { data, error } = await admin.auth.admin.getUserById(resolvedOwnerId);
    if (error || !data.user) return false;
    return isSupportAdmin(resolveAuthEmail(data.user));
  } catch {
    return false;
  }
}

/** Primera tienda del usuario admin (dueño), o null si no tiene vitrina. */
export async function getAdminOwnedStoreForUser(userId: string): Promise<{
  id: string;
  slug: string;
  name: string;
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stores")
    .select("id, slug, name")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as { id: string; slug: string; name: string };
  return { id: row.id, slug: row.slug, name: row.name };
}
