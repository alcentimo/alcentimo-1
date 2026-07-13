export const STORE_CATEGORY_OPTIONS = [
  "Ropa",
  "Comida",
  "Tecnología",
  "Servicios",
  "Otros",
] as const;

export type StoreCategoryOption = (typeof STORE_CATEGORY_OPTIONS)[number];
