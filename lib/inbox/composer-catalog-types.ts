export type ComposerCommandCategoryId =
  | "quick_replies"
  | "catalog_products"
  | "payment_links";

export interface ComposerCommand {
  id: string;
  category: ComposerCommandCategoryId;
  label: string;
  description: string;
  keywords: string[];
  snippet: string;
}

export interface ComposerCommandGroup {
  id: ComposerCommandCategoryId;
  label: string;
  items: ComposerCommand[];
}

export interface ComposerCatalogProduct {
  id: string;
  name: string;
  priceUsd: number | null;
}
