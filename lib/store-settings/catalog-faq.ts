import type {
  CatalogFaqItem,
  CatalogFaqSettings,
} from "@/lib/store-settings/types";

export const MAX_CATALOG_FAQ_ITEMS = 12;
export const CATALOG_FAQ_QUESTION_MAX = 160;
export const CATALOG_FAQ_ANSWER_MAX = 800;

export function defaultCatalogFaqSettings(): CatalogFaqSettings {
  return {
    enabled: false,
    items: [],
  };
}

export function createCatalogFaqItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeFaqItem(raw: unknown): CatalogFaqItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const question =
    typeof item.question === "string"
      ? item.question.trim().slice(0, CATALOG_FAQ_QUESTION_MAX)
      : "";
  const answer =
    typeof item.answer === "string"
      ? item.answer.trim().slice(0, CATALOG_FAQ_ANSWER_MAX)
      : "";
  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id.trim()
      : createCatalogFaqItemId();

  return { id, question, answer };
}

/** Conserva ítems en edición aunque aún estén vacíos (panel de administración). */
export function normalizeCatalogFaqDraft(raw: unknown): CatalogFaqSettings {
  if (!raw || typeof raw !== "object") {
    return defaultCatalogFaqSettings();
  }

  const value = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map(normalizeFaqItem)
    .filter((item): item is CatalogFaqItem => item != null)
    .slice(0, MAX_CATALOG_FAQ_ITEMS);

  return {
    enabled: value.enabled === true,
    items,
  };
}

/** Solo ítems con pregunta y respuesta para el catálogo público. */
export function normalizeCatalogFaqSettings(raw: unknown): CatalogFaqSettings {
  const draft = normalizeCatalogFaqDraft(raw);
  const items = draft.items.filter(
    (item) => item.question.length > 0 && item.answer.length > 0,
  );

  return {
    enabled: draft.enabled && items.length > 0,
    items,
  };
}

export function sanitizeCatalogFaqForStorage(
  raw: unknown,
): CatalogFaqSettings {
  return normalizeCatalogFaqSettings(raw);
}
