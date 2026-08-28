import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/slugify";

/** Palabras funcionales que no aportan al slug SEO corto. */
const PRODUCT_SLUG_STOPWORDS = new Set([
  "a",
  "al",
  "and",
  "con",
  "de",
  "del",
  "el",
  "en",
  "for",
  "in",
  "la",
  "las",
  "los",
  "of",
  "or",
  "para",
  "por",
  "que",
  "su",
  "sus",
  "the",
  "to",
  "un",
  "una",
  "unas",
  "unos",
  "with",
  "y",
]);

const PRODUCT_SLUG_MAX_KEYWORDS = 4;

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

function isKeywordToken(token: string): boolean {
  if (PRODUCT_SLUG_STOPWORDS.has(token)) return false;
  if (token.length === 1 && !/[0-9]/.test(token)) return false;
  return true;
}

/**
 * Primeras 3–4 palabras clave del título, sin artículos ni preposiciones.
 * Ej.: "Camisa de manga corta para hombre talla L color azul" → "camisa-manga-corta-hombre"
 */
export function shortProductSlugBase(
  name: string,
  options?: { fallbackBase?: string },
): string {
  const fallback = options?.fallbackBase || "producto";
  const tokens = slugify(name).split("-").filter(Boolean);
  if (tokens.length === 0) return fallback;

  const keywords = tokens.filter(isKeywordToken);
  const picked =
    keywords.length > 0
      ? keywords.slice(0, PRODUCT_SLUG_MAX_KEYWORDS)
      : tokens.slice(0, PRODUCT_SLUG_MAX_KEYWORDS);

  return (picked.join("-") || fallback).slice(0, 60);
}

export function buildProductSlugWithSuffix(
  base: string,
  suffix = randomProductSlugSuffix(4),
): string {
  const core = base.replace(/^-+|-+$/g, "") || "producto";
  return `${core}-${suffix}`.slice(0, 80);
}

/**
 * Reserva un slug único por tienda.
 * Incluye productos soft-deleted (siguen ocupando products_store_slug_unique).
 * Formato: palabras-clave-a4f2 (corto, estable para SEO).
 */
export async function allocateUniqueProductSlug(
  supabase: SupabaseClient,
  storeId: string,
  name: string,
  options?: { fallbackBase?: string },
): Promise<string> {
  const base = shortProductSlugBase(name, options);
  const maxAttempts = 8;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = buildProductSlugWithSuffix(base);

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

  return buildProductSlugWithSuffix(
    base,
    `${Date.now().toString(36)}${randomProductSlugSuffix(3)}`,
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
