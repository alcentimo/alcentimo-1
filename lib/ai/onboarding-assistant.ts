import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import { AI_MAX_TOKENS } from "@/lib/ai/token-limits";
import type {
  OnboardingSampleProductDraft,
  OnboardingSampleProductsResult,
  OnboardingWelcomeInput,
} from "@/lib/ai/onboarding-assistant-types";
import {
  getProductCategoriesForRubro,
  getRubroLabel,
  type StoreRubro,
} from "@/src/config/categories";

const SAMPLE_PRODUCT_COUNT = 3;

function buildWelcomeFallback(input: OnboardingWelcomeInput): string {
  return `¡Hola! Bienvenido/a a Alcentimo, ${input.storeName}. Tu tienda de ${input.rubroLabel} ya está lista. En los próximos minutos puedes cargar productos, configurar pagos y compartir tu catálogo con clientes.`;
}

function buildWelcomeSystemPrompt(): string {
  return "Saludo onboarding Alcentimo en español, cálido, sin emojis. 2-3 frases: tienda, rubro, cargar productos y compartir catálogo. Máx 280 chars. Solo texto.";
}

function buildSampleProductsSystemPrompt(rubroLabel: string, categories: string[]): string {
  return [
    `Genera ${SAMPLE_PRODUCT_COUNT} productos ejemplo para tienda ${rubroLabel}.`,
    `Categorías: ${categories.join(", ")}.`,
    'JSON: { "intro", "products":[{ "nombre","descripcion","precio","stock","categoria" }] }',
    "precio 1-500 USD, stock 3-50, sin marcas famosas.",
  ].join(" ");
}

function parseSampleProductsJson(
  content: string,
  allowedCategories: string[],
): OnboardingSampleProductsResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
  }

  const intro =
    typeof parsed.intro === "string" && parsed.intro.trim()
      ? parsed.intro.trim()
      : "Estos productos de ejemplo te ayudan a ver cómo se ve tu catálogo. Puedes editarlos o eliminarlos cuando quieras.";

  const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
  const allowed = new Set(allowedCategories.map((item) => item.toLowerCase()));
  const fallbackCategory = allowedCategories[0] ?? "General";

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
      const match = allowedCategories.find(
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
    throw new Error("La IA no generó productos válidos. Intenta de nuevo.");
  }

  return {
    intro,
    products: products.slice(0, SAMPLE_PRODUCT_COUNT),
  };
}

function buildFallbackSampleProducts(rubro: StoreRubro): OnboardingSampleProductsResult {
  const categories = getProductCategoriesForRubro(rubro);
  const label = getRubroLabel(rubro);
  const category = categories[0]?.label ?? "General";

  const presets: Record<StoreRubro, OnboardingSampleProductDraft[]> = {
    "ropa-moda": [
      {
        nombre: "Camisa casual algodón",
        descripcion: "Camisa cómoda para uso diario, disponible en tallas variadas.",
        precio: 18.5,
        stock: 12,
        categoria: categories.find((c) => c.slug === "camisas")?.label ?? category,
      },
      {
        nombre: "Jean clásico azul",
        descripcion: "Pantalón resistente con corte recto, ideal para combinar.",
        precio: 24,
        stock: 10,
        categoria: categories.find((c) => c.slug === "pantalones")?.label ?? category,
      },
      {
        nombre: "Zapatos urbanos",
        descripcion: "Calzado versátil para caminar con comodidad todo el día.",
        precio: 32,
        stock: 8,
        categoria: categories.find((c) => c.slug === "zapatos")?.label ?? category,
      },
    ],
    alimentos: [
      {
        nombre: "Café molido premium 500g",
        descripcion: "Mezcla balanceada con aroma intenso, ideal para el hogar.",
        precio: 9.5,
        stock: 20,
        categoria: category,
      },
      {
        nombre: "Galletas artesanales",
        descripcion: "Paquete surtido crujiente, perfecto para compartir.",
        precio: 4.25,
        stock: 30,
        categoria: category,
      },
      {
        nombre: "Jugo natural 1L",
        descripcion: "Bebida refrescante lista para servir bien fría.",
        precio: 3.75,
        stock: 24,
        categoria: category,
      },
    ],
    tecnologia: [
      {
        nombre: "Audífonos inalámbricos",
        descripcion: "Sonido claro y batería de larga duración para el día a día.",
        precio: 29.99,
        stock: 15,
        categoria: category,
      },
      {
        nombre: "Cable USB-C 1m",
        descripcion: "Carga rápida compatible con smartphones y tablets.",
        precio: 6.5,
        stock: 40,
        categoria: category,
      },
      {
        nombre: "Funda protectora smartphone",
        descripcion: "Protección ligera contra golpes y rayones.",
        precio: 8,
        stock: 25,
        categoria: category,
      },
    ],
    coleccionables: [
      {
        nombre: "Cómic edición estándar",
        descripcion: "Ejemplar en buen estado para coleccionistas.",
        precio: 12,
        stock: 6,
        categoria: category,
      },
      {
        nombre: "Figura coleccionable",
        descripcion: "Pieza decorativa ideal para exhibir en estantería.",
        precio: 22,
        stock: 5,
        categoria: category,
      },
      {
        nombre: "Tarjetas protectoras pack x50",
        descripcion: "Fundas rígidas para conservar cartas en perfecto estado.",
        precio: 7.5,
        stock: 18,
        categoria: category,
      },
    ],
    "salud-belleza": [
      {
        nombre: "Crema hidratante facial",
        descripcion: "Fórmula suave para uso diario en todo tipo de piel.",
        precio: 14.5,
        stock: 16,
        categoria: category,
      },
      {
        nombre: "Shampoo reparador 400ml",
        descripcion: "Limpieza profunda con acabado suave y brillante.",
        precio: 11,
        stock: 20,
        categoria: category,
      },
      {
        nombre: "Kit de cuidado personal",
        descripcion: "Set básico con lo esencial para rutina diaria.",
        precio: 19.99,
        stock: 10,
        categoria: category,
      },
    ],
    "papeleria-libreria-oficina": [
      {
        nombre: "Cuaderno universitario 100 hojas",
        descripcion: "Rayado estándar, tapa resistente para clases y oficina.",
        precio: 3.5,
        stock: 35,
        categoria: category,
      },
      {
        nombre: "Set de bolígrafos x12",
        descripcion: "Escritura fluida en colores surtidos.",
        precio: 5.25,
        stock: 28,
        categoria: category,
      },
      {
        nombre: "Archivador tamaño carta",
        descripcion: "Organiza documentos con lomo resistente.",
        precio: 6.75,
        stock: 14,
        categoria: category,
      },
    ],
  };

  return {
    intro: `Preparamos ${SAMPLE_PRODUCT_COUNT} productos de ejemplo para tu tienda de ${label}. Puedes editarlos o eliminarlos cuando quieras.`,
    products: presets[rubro] ?? presets.tecnologia,
  };
}

export async function generateOnboardingWelcomeMessage(
  input: OnboardingWelcomeInput,
): Promise<string> {
  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.7,
      max_tokens: AI_MAX_TOKENS.onboardingWelcome,
      messages: [
        { role: "system", content: buildWelcomeSystemPrompt() },
        {
          role: "user",
          content: `Tienda:${input.storeName} Rubro:${input.rubroLabel}`,
        },
      ],
    });

    return content.slice(0, 320);
  } catch (error) {
    if (error instanceof OpenRouterChatError) {
      return buildWelcomeFallback(input);
    }
    return buildWelcomeFallback(input);
  }
}

export async function generateOnboardingSampleProducts(
  rubro: StoreRubro,
): Promise<OnboardingSampleProductsResult> {
  const rubroLabel = getRubroLabel(rubro);
  const categories = getProductCategoriesForRubro(rubro).map((item) => item.label);

  if (categories.length === 0) {
    return buildFallbackSampleProducts(rubro);
  }

  try {
    const content = await createOpenRouterChatCompletion({
      temperature: 0.55,
      max_tokens: AI_MAX_TOKENS.onboardingProducts,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSampleProductsSystemPrompt(rubroLabel, categories),
        },
        {
          role: "user",
          content: `Rubro:${rubroLabel}`,
        },
      ],
    });

    return parseSampleProductsJson(content, categories);
  } catch {
    return buildFallbackSampleProducts(rubro);
  }
}
