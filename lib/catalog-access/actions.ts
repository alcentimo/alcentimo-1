"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getPublicStoreBySlug } from "@/lib/stores";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { persistCatalogAccessMode } from "@/lib/catalog-access/persist";
import {
  catalogUnlockCookieName,
  catalogUnlockToken,
  hashCatalogPassword,
  isCatalogAccessMode,
  normalizeCatalogAccessSettings,
  type CatalogAccessMode,
} from "@/lib/catalog-access/types";

type ActionResult = { error?: string; success?: boolean; hasPassword?: boolean };

export async function getCatalogAccessAdminState(): Promise<
  ActionResult & {
    mode?: CatalogAccessMode;
    hasPassword?: boolean;
  }
> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const settings = await getStoreSettingsConfig(auth.store.id);
  const mode = normalizeCatalogAccessSettings(settings.catalogAccess).mode;

  const admin = createAdminClient();
  const { data } = await admin
    .from("store_catalog_secrets")
    .select("store_id")
    .eq("store_id", auth.store.id)
    .maybeSingle();

  return {
    success: true,
    mode,
    hasPassword: Boolean(data?.store_id),
  };
}

export async function saveCatalogAccessSettings(input: {
  mode: CatalogAccessMode;
  password?: string;
  clearPassword?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  if (!isCatalogAccessMode(input.mode)) {
    return { error: "Modo de acceso inválido." };
  }

  const password = (input.password ?? "").trim();
  if (input.mode === "password") {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("store_catalog_secrets")
      .select("store_id")
      .eq("store_id", auth.store.id)
      .maybeSingle();

    if (!existing && password.length < 4) {
      return {
        error:
          "Indica una contraseña de al menos 4 caracteres para proteger el catálogo.",
      };
    }

    if (password.length > 0) {
      if (password.length < 4) {
        return { error: "La contraseña debe tener al menos 4 caracteres." };
      }
      const hash = hashCatalogPassword(password, auth.store.id);
      const { error } = await admin.from("store_catalog_secrets").upsert({
        store_id: auth.store.id,
        password_hash: hash,
        updated_at: new Date().toISOString(),
      });
      if (error) return { error: error.message };
    }
  }

  if (input.clearPassword || input.mode !== "password") {
    if (input.mode !== "password" || input.clearPassword) {
      const admin = createAdminClient();
      await admin
        .from("store_catalog_secrets")
        .delete()
        .eq("store_id", auth.store.id);
    }
  }

  const persist = await persistCatalogAccessMode(auth.store.id, input.mode);
  if (persist.error) return { error: persist.error };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);
  return { success: true };
}

export async function unlockCatalogWithPassword(input: {
  storeSlug: string;
  password: string;
}): Promise<ActionResult> {
  const store = await getPublicStoreBySlug(input.storeSlug);
  if (!store) return { error: "Catálogo no encontrado." };

  const publicSettings = await getPublicStoreSettingsConfig(store.id);
  const mode = normalizeCatalogAccessSettings(publicSettings.catalogAccess).mode;
  if (mode !== "password") {
    return { error: "Este catálogo no está protegido con contraseña." };
  }

  const password = input.password.trim();
  if (!password) return { error: "Ingresa la contraseña." };

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("store_catalog_secrets")
    .select("password_hash")
    .eq("store_id", store.id)
    .maybeSingle();

  if (!secret?.password_hash) {
    return { error: "El catálogo aún no tiene contraseña configurada." };
  }

  const candidate = hashCatalogPassword(password, store.id);
  if (candidate !== secret.password_hash) {
    return { error: "Contraseña incorrecta." };
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: catalogUnlockCookieName(store.id),
    value: catalogUnlockToken(store.id, secret.password_hash),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  revalidatePath(`/c/${store.slug}`);
  return { success: true };
}
