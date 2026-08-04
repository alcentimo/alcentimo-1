import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { getUserStore } from "@/lib/stores";
import {
  catalogUnlockCookieName,
  catalogUnlockToken,
  isCatalogAccessMode,
  normalizeCatalogAccessSettings,
  type CatalogAccessMode,
} from "@/lib/catalog-access/types";

export type CatalogAccessResolution =
  | { status: "open"; mode: CatalogAccessMode; storeId: string; preview?: boolean }
  | {
      status: "locked";
      mode: "private" | "password";
      storeId: string;
      storeName: string;
      reason: "private" | "password_required";
    }
  | { status: "unavailable"; mode: "draft"; storeId: string; storeName: string };

async function isStoreStaff(storeId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const store = await getUserStore(supabase, user.id);
    return Boolean(store && store.id === storeId);
  } catch {
    return false;
  }
}

async function hasValidUnlockCookie(
  storeId: string,
  passwordHash: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(catalogUnlockCookieName(storeId))?.value;
  if (!value) return false;
  return value === catalogUnlockToken(storeId, passwordHash);
}

async function getPasswordHash(storeId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_catalog_secrets")
    .select("password_hash")
    .eq("store_id", storeId)
    .maybeSingle();
  return typeof data?.password_hash === "string" ? data.password_hash : null;
}

/**
 * Resuelve si el visitante puede ver el catálogo público.
 * Staff de la tienda siempre puede previsualizar modos restringidos.
 */
export async function resolveCatalogAccess(input: {
  storeId: string;
  storeName: string;
  mode?: CatalogAccessMode | null;
}): Promise<CatalogAccessResolution> {
  let mode = input.mode ?? null;

  if (!mode) {
    const settings = await getPublicStoreSettingsConfig(input.storeId);
    mode = normalizeCatalogAccessSettings(settings.catalogAccess).mode;
  }

  // Preferir columna denormalizada si está disponible y es válida.
  try {
    const publicClient = getPublicServerClient();
    const { data } = await publicClient
      .from("stores")
      .select("catalog_access_mode")
      .eq("id", input.storeId)
      .maybeSingle();
    if (isCatalogAccessMode(data?.catalog_access_mode)) {
      mode = data.catalog_access_mode;
    }
  } catch {
    // fallback a settings
  }

  const staff = await isStoreStaff(input.storeId);
  if (mode === "public") {
    return { status: "open", mode, storeId: input.storeId };
  }

  if (staff) {
    return {
      status: "open",
      mode,
      storeId: input.storeId,
      preview: true,
    };
  }

  if (mode === "draft") {
    return {
      status: "unavailable",
      mode: "draft",
      storeId: input.storeId,
      storeName: input.storeName,
    };
  }

  if (mode === "private") {
    return {
      status: "locked",
      mode: "private",
      storeId: input.storeId,
      storeName: input.storeName,
      reason: "private",
    };
  }

  // password
  const hash = await getPasswordHash(input.storeId);
  if (hash && (await hasValidUnlockCookie(input.storeId, hash))) {
    return { status: "open", mode: "password", storeId: input.storeId };
  }

  return {
    status: "locked",
    mode: "password",
    storeId: input.storeId,
    storeName: input.storeName,
    reason: "password_required",
  };
}
