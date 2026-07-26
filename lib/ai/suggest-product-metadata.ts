import {
  createOpenRouterChatCompletion,
  OpenRouterChatError,
} from "@/lib/ai/openrouter-client";
import type {
  SuggestProductMetadataInput,
  SuggestProductMetadataResult,
} from "@/lib/ai/product-metadata-types";
import { AI_MAX_TOKENS, AI_MAX_INPUT_CHARS } from "@/lib/ai/token-limits";
import {
  detectProductFromTitle,
  mergeDetectedExtraFields,
} from "@/lib/products/detect-product-from-title";
import { resolveProductFieldLabels } from "@/lib/products/resolve-product-field-labels";
import { pickExtraFieldValues } from "@/lib/products/extra-fields";

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

function buildCategoryList(
  categories: SuggestProductMetadataInput["categories"],
): string {
  return categories
    .slice(0, 24)
    .map((item) => `${item.slug}=${item.label}`)
    .join("; ");
}

function buildSystemPrompt(fieldLabels: string[]): string {
  const fieldsHint =
    fieldLabels.length > 0
      ? `Campos opcionales: ${fieldLabels.slice(0, 12).join(", ")}.`
      : "Sin campos extra.";
  return [
    "Clasificador e-commerce LATAM. JSON: { categorySlug, extraFields }.",
    "categorySlug debe ser uno de la lista. extraFields: objeto label→valor corto inferido del título.",
    fieldsHint,
    "No inventar specs no sugeridas por el título. Valores cortos.",
  ].join(" ");
}

function parseModelJson(
  content: string,
  categories: SuggestProductMetadataInput["categories"],
  fieldLabels: string[],
): Pick<SuggestProductMetadataResult, "categorySlug" | "categoryLabel" | "extraFields"> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("La IA devolvió un formato inválido.");
  }

  const rawSlug =
    typeof parsed.categorySlug === "string"
      ? parsed.categorySlug.trim()
      : typeof parsed.category_slug === "string"
        ? parsed.category_slug.trim()
        : "";

  const allowed = new Set(categories.map((item) => item.slug));
  const categorySlug = allowed.has(rawSlug) ? rawSlug : null;
  const categoryLabel =
    categories.find((item) => item.slug === categorySlug)?.label ?? null;

  const extraFields: Record<string, string> = {};
  const rawFields = parsed.extraFields ?? parsed.extra_fields;
  if (rawFields && typeof rawFields === "object" && !Array.isArray(rawFields)) {
    for (const [key, value] of Object.entries(rawFields)) {
      if (typeof value === "string" && fieldLabels.includes(key)) {
        extraFields[key] = value.trim().slice(0, 120);
      }
    }
  }

  return { categorySlug, categoryLabel, extraFields };
}

async function suggestWithAi(
  input: SuggestProductMetadataInput,
  fieldLabels: string[],
): Promise<Pick<SuggestProductMetadataResult, "categorySlug" | "categoryLabel" | "extraFields">> {
  const title = truncate(input.draftTitle, AI_MAX_INPUT_CHARS.draftTitle);
  const userContent = [
    `Rubro:${input.storeRubro}`,
    `Categorías:${buildCategoryList(input.categories)}`,
    input.ruleCategorySlug ? `Sugerida:${input.ruleCategorySlug}` : null,
    `Título:"${title}"`,
  ]
    .filter(Boolean)
    .join(" | ");

  const content = await createOpenRouterChatCompletion({
    temperature: 0.2,
    max_tokens: AI_MAX_TOKENS.productMetadata,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(fieldLabels) },
      { role: "user", content: userContent },
    ],
  });

  return parseModelJson(content, input.categories, fieldLabels);
}

/**
 * Sugiere categoría y specs: reglas locales + IA opcional para refinar.
 */
export async function suggestProductMetadata(
  input: SuggestProductMetadataInput,
): Promise<SuggestProductMetadataResult> {
  const title = input.draftTitle.trim();
  if (title.length < 3) {
    return {
      categorySlug: null,
      categoryLabel: null,
      extraFields: {},
      source: "rules",
    };
  }

  const rules = detectProductFromTitle(
    title,
    input.storeRubro,
    input.categories,
  );

  const ruleSlug = rules.categorySlug;
  const ruleLabels = ruleSlug
    ? resolveProductFieldLabels(input.storeRubro, ruleSlug)
    : input.fieldLabels ?? [];

  const rulesConfident = rules.confidence >= 3;

  if (rulesConfident && ruleSlug) {
    return {
      categorySlug: ruleSlug,
      categoryLabel: rules.categoryLabel,
      extraFields: pickExtraFieldValues(rules.extraFields, ruleLabels),
      source: "rules",
    };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    if (!ruleSlug) {
      return {
        categorySlug: null,
        categoryLabel: null,
        extraFields: {},
        source: "rules",
      };
    }
    return {
      categorySlug: ruleSlug,
      categoryLabel: rules.categoryLabel,
      extraFields: pickExtraFieldValues(rules.extraFields, ruleLabels),
      source: "rules",
    };
  }

  try {
    const aiLabels =
      ruleSlug != null
        ? resolveProductFieldLabels(input.storeRubro, ruleSlug)
        : ruleLabels;

    const ai = await suggestWithAi(
      { ...input, ruleCategorySlug: ruleSlug },
      aiLabels.length > 0 ? aiLabels : input.fieldLabels ?? [],
    );

    const categorySlug = ai.categorySlug ?? ruleSlug;
    const categoryLabel =
      input.categories.find((item) => item.slug === categorySlug)?.label ??
      rules.categoryLabel;

    const labels = categorySlug
      ? resolveProductFieldLabels(input.storeRubro, categorySlug)
      : aiLabels;

    const mergedExtra = pickExtraFieldValues(
      mergeDetectedExtraFields(rules.extraFields, ai.extraFields, labels),
      labels,
    );

    let source: SuggestProductMetadataResult["source"] = "rules";
    if (ai.categorySlug) {
      source =
        ruleSlug && ai.categorySlug !== ruleSlug ? "hybrid" : "ai";
    }

    return {
      categorySlug,
      categoryLabel,
      extraFields: mergedExtra,
      source,
    };
  } catch (error) {
    if (error instanceof OpenRouterChatError) {
      if (!ruleSlug) {
        return {
          categorySlug: null,
          categoryLabel: null,
          extraFields: {},
          source: "rules",
        };
      }
      return {
        categorySlug: ruleSlug,
        categoryLabel: rules.categoryLabel,
        extraFields: pickExtraFieldValues(rules.extraFields, ruleLabels),
        source: "rules",
      };
    }
    throw error;
  }
}
