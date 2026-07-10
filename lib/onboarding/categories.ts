export const STORE_CATEGORY_OPTIONS = [
  "Alimentos y bebidas",
  "Ropa y accesorios",
  "Ferretería y construcción",
  "Salud y belleza",
  "Tecnología",
  "Hogar y decoración",
  "Repuestos y automotriz",
  "Servicios",
  "Otros",
] as const;

export type StoreCategoryOption = (typeof STORE_CATEGORY_OPTIONS)[number];
