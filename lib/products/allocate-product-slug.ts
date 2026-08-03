import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";

/** Sufijo corto alfanumérico para desambiguar slugs de producto. */
export function randomProductSlugSuffix(length = 5): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/**
 * Reserva un slug único por tienda.
 * Incluye productos soft-deleted (siguen ocupando products_store_slug_unique).
 */
export async function allocateUniqueProductSlug(
  supabase: SupabaseClient,
  storeId: string,
  name: string,
  options?: { fallbackBase?: string },
): Promise<string> {
  const base = slugify(name) || options?.fallbackBase || "producto";
  const maxAttempts = 8;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate =
      i === 0
        ? base
        : `${base}-${randomProductSlugSuffix(5)}`.slice(0, 80);

    const { data: taken, error } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      continue;
    }
    if (!taken) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}${randomProductSlugSuffix(3)}`.slice(
    0,
    80,
  );
}

export function isProductSlugUniqueViolation(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23505" &&
    (error.message?.includes("products_store_slug_unique") ?? false)
  );
}
