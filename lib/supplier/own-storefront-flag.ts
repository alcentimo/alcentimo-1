import { createAdminClient } from "@/lib/supabase/admin";
import { parsePublicCatalogEnabled } from "@/lib/catalog/supplier-public-catalog-flag";

/** Lectura ligera para middleware: no importa sharp ni el sync de catálogo. */
export async function lookupSupplierOwnStorefrontByUserId(
  userId: string,
): Promise<boolean> {
  if (!userId.trim()) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("supplier_profiles")
      .select("show_public_catalog")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) return false;
    return parsePublicCatalogEnabled(
      (data as { show_public_catalog?: unknown } | null)?.show_public_catalog,
    );
  } catch {
    return false;
  }
}

/** Lectura ligera: el proveedor puede usar el panel /dashboard de dropshipper. */
export async function lookupSupplierStoreModeByUserId(
  userId: string,
): Promise<boolean> {
  if (!userId.trim()) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("supplier_profiles")
      .select("store_mode_enabled")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) return false;
    return parsePublicCatalogEnabled(
      (data as { store_mode_enabled?: unknown } | null)?.store_mode_enabled,
    );
  } catch {
    return false;
  }
}
