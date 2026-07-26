import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import type { OnboardingSampleProductDraft } from "@/lib/ai/onboarding-assistant-types";
import { generateOnboardingSampleProducts } from "@/lib/ai/onboarding-assistant";
import type { LandingInstantStoreResult } from "@/lib/ai/landing-instant-store-types";
import {
  DEFAULT_STORE_RUBRO,
  getProductCategoriesForRubro,
  getRubroLabel,
  isValidStoreRubro,
  normalizeStoreRubro,
  STORE_RUBRO_OPTIONS,
  type StoreRubro,
} from "@/src/config/categories";

const SAMPLE_PRODUCT_COUNT = 3;
const MAX_HINT_LENGTH = AI_MAX_INPUT_CHARS.businessHint;

function truncateHint(value: string): string {
  return value.trim().slice(0, MAX_HINT_LENGTH);
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function inferRubroFromHint(hint: string): StoreRubro {
  const h = hint.toLowerCase();
  if (/pasteler|panader|reposter|dulce|comida|bebida|restaur|caf[eé]|aliment|bodega|minimarket/.test(h)) {
    return "alimentos";
  }
  if (/ropa|moda|zapato|calzado|boutique|vestir|tienda de ropa/.test(h)) {
    return "ropa-moda";
  }
  if (/ferret|tornill|herramient|tech|electr|celular|comput|repuesto|inform/.test(h)) {
    return "tecnologia";
  }
  if (/c[oó]mic|figura|coleccion|tcg|cartas/.test(h)) {
    return "coleccionables";
  }
  if (/belleza|cosm[eé]t|spa|salud|farmacia|perfum/.test(h)) {
    return "salud-belleza";
  }
  if (/papeler|librer|oficina|utiles|escolar/.test(h)) {
    return "papeleria-libreria-oficina";
  }
  return DEFAULT_STORE_RUBRO;
}

function inferStoreNameFromHint(hint: string): string {
  const trimmed = truncateHint(hint);
  if (!trimmed) return "Mi Tienda";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 4) {
    return titleCaseWords(trimmed);
  }
  return titleCaseWords(words.slice(0, 4).join(" "));
}

function buildInstantStoreSystemPrompt(): string {
  const rubroList = STORE_RUBRO_OPTIONS.map((option) => option.value).join(", ");

  return [
    "Genera borrador tienda digital Venezuela.",
    `Rubros:${rubroList}`,
    'JSON: { "storeName","rubro","intro","products":[{ "nombre","descripcion","precio","stock","categoria" }] }',
    `${SAMPLE_PRODUCT_COUNT} productos, precio 1-500, stock 3-50, sin marcas famosas.`,
  ].join(" ");
}

function parseInstantStoreJson(
  content: string,
  businessHint: string,
): LandingInstantStoreResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("Formato inválido de la IA.");
  }

  const rubroRaw =
    typeof parsed.rubro === "string" ? parsed.rubro.trim().toLowerCase() : "";
  const rubro = isValidStoreRubro(rubroRaw)
    ? normalizeStoreRubro(rubroRaw)
    : inferRubroFromHint(businessHint);

  const categories = getProductCategoriesForRubro(rubro).map((item) => item.label);
  const allowed = new Set(categories.map((item) => item.toLowerCase()));
  const fallbackCategory = categories[0] ?? "General";

  const storeName =
    typeof parsed.storeName === "string" && parsed.storeName.trim()
      ? parsed.storeName.trim().slice(0, 80)
      : inferStoreNameFromHint(businessHint);

  const intro =
    typeof parsed.intro === "string" && parsed.intro.trim()
      ? parsed.intro.trim().slice(0, 220)
      : `Así se vería tu catálogo de ${storeName}. Puedes editarlo cuando crees tu cuenta.`;

  const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
  const products: OnboardingSampleProductDraft[] = [];

  for (const item of rawProducts) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
    const descripcion =
      typeof row.descripcion === "string" ? row.descripcion.trim() : "";
    const precio =
      typeof row.precio === "number"
        ? row.precio
        : Number.parseFloat(String(row.precio ?? ""));
    const stock =
      typeof row.stock === "number"
        ? row.stock
        : Number.parseInt(String(row.stock ?? ""), 10);
    let categoria =
      typeof row.categoria === "string" ? row.categoria.trim() : fallbackCategory;

    if (!allowed.has(categoria.toLowerCase())) {
      const match = categories.find(
        (option) => option.toLowerCase() === categoria.toLowerCase(),
      );
      categoria = match ?? fallbackCategory;
    }

    if (!nombre || !Number.isFinite(precio) || precio <= 0 || !Number.isFinite(stock)) {
      continue;
    }

    products.push({
      nombre: nombre.slice(0, 80),
      descripcion: descripcion.slice(0, 180),
      precio: Math.min(500, Math.max(1, Math.round(precio * 100) / 100)),
      stock: Math.min(50, Math.max(3, Math.round(stock))),
      categoria,
    });
  }

  if (products.length === 0) {
    throw new Error("Productos inválidos.");
  }

  return {
    storeName,
    rubro,
    rubroLabel: getRubroLabel(rubro),
    intro,
    products: products.slice(0, SAMPLE_PRODUCT_COUNT),
  };
}

async function buildFallbackInstantStore(
  businessHint: string,
): Promise<LandingInstantStoreResult> {
  const rubro = inferRubroFromHint(businessHint);
  const generated = await generateOnboardingSampleProducts(rubro);

  return {
    storeName: inferStoreNameFromHint(businessHint),
    rubro,
    rubroLabel: getRubroLabel(rubro),
    intro: generated.intro,
    products: generated.products,
  };
}

export async function generateLandingInstantStore(
  businessHint: string,
): Promise<LandingInstantStoreResult> {
  const hint = truncateHint(businessHint);
  if (hint.length < 3) {
    throw new Error("Describe tu negocio en al menos 3 caracteres.");
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.6,
      max_tokens: AI_MAX_TOKENS.instantStore,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildInstantStoreSystemPrompt() },
        {
          role: "user",
          content: `Negocio:${hint}`,
        },
      ],
    });

    return parseInstantStoreJson(content, hint);
  } catch (error) {
    if (error instanceof OpenRouterChatError && error.status === 503) {
      return buildFallbackInstantStore(hint);
    }
    try {
      return await buildFallbackInstantStore(hint);
    } catch {
      if (error instanceof Error) throw error;
      throw new Error("No se pudo generar la vista previa.");
    }
  }
}
