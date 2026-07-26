import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";

export interface SuggestProductMetadataInput {
  draftTitle: string;
  storeRubro: string;
  categories: Array<{ slug: string; label: string }>;
  /** Categoría detectada por reglas (pista para la IA). */
  ruleCategorySlug?: string | null;
  fieldLabels?: string[];
}

export interface SuggestProductMetadataResult {
  categorySlug: string | null;
  categoryLabel: string | null;
  extraFields: ProductExtraFieldsMap;
  source: "rules" | "ai" | "hybrid";
}
