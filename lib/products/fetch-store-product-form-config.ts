"use server";

import { getStoreProductFormConfig } from "@/lib/products/store-field-config";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";

/**
 * Lee el rubro y categorías actuales de la tienda (sin caché).
 * Usado al abrir Nuevo producto / Editar para no quedar con el rubro anterior.
 */
export async function fetchStoreProductFormConfig(): Promise<{
  config?: StoreProductFormConfig;
  error?: string;
}> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    const config = await getStoreProductFormConfig(auth.store.id);
    return { config };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración del rubro.",
    };
  }
}
