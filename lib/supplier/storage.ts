import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadProductImage } from "@/lib/storage";

/**
 * Sube la foto del producto de proveedor bajo `supplier/{userId}/…`
 * reutilizando la optimización de imágenes de catálogo.
 */
export async function uploadSupplierProductImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ publicUrl?: string; error?: string }> {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anon";
  const result = await uploadProductImage(
    supabase,
    `supplier/${safeUserId}`,
    file,
  );

  if (result.error || !result.url) {
    return { error: result.error ?? "No se pudo subir la imagen." };
  }

  return { publicUrl: result.url };
}
