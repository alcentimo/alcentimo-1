import { slugify } from "@/lib/slugify";
import { isValidStoreSlug } from "@/lib/stores/slug";

export const STORE_SLUG_UNAVAILABLE_MESSAGE =
  "Este enlace ya no está disponible. Otro negocio ya lo usa en su catálogo público.";

export const STORE_SLUG_INVALID_MESSAGE =
  "El enlace solo puede usar letras minúsculas, números y guiones.";

export const STORE_SLUG_EMPTY_MESSAGE = "El enlace no puede estar vacío.";

export function normalizeStoreSlugCandidate(raw: string): string {
  return slugify(raw.trim());
}

export type StoreSlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export function validateStoreSlugCandidate(raw: string): StoreSlugValidationResult {
  const slug = normalizeStoreSlugCandidate(raw);
  if (!slug) {
    return { ok: false, error: STORE_SLUG_EMPTY_MESSAGE };
  }
  if (!isValidStoreSlug(slug)) {
    return { ok: false, error: STORE_SLUG_INVALID_MESSAGE };
  }
  return { ok: true, slug };
}
