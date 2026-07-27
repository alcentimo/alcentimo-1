import type { StoreRubro } from "@/src/config/categories";

export type AssistantAvatarCategoryId =
  | "general"
  | "tech"
  | "anime"
  | "fashion"
  | "food"
  | "wellness"
  | "office"
  | "collectibles";

export interface AssistantAvatarCategory {
  id: AssistantAvatarCategoryId;
  label: string;
}

export interface AssistantAvatarPreset {
  id: string;
  label: string;
  categoryId: AssistantAvatarCategoryId;
  /** Ruta pública del asset (SVG). */
  imagePath: string;
  /** Rubros donde se sugiere destacar este avatar en la galería. */
  suggestedRubros?: StoreRubro[];
}

export const ASSISTANT_AVATAR_CATEGORIES: AssistantAvatarCategory[] = [
  { id: "general", label: "General / neutro" },
  { id: "tech", label: "Tecnología" },
  { id: "anime", label: "Anime y cómics" },
  { id: "fashion", label: "Moda y estilo" },
  { id: "food", label: "Alimentos" },
  { id: "wellness", label: "Salud y belleza" },
  { id: "office", label: "Oficina y papelería" },
  { id: "collectibles", label: "Coleccionables" },
];

export const ASSISTANT_AVATAR_PRESETS: AssistantAvatarPreset[] = [
  {
    id: "general-orbit",
    label: "Orbita amigable",
    categoryId: "general",
    imagePath: "/assistant-avatars/general-orbit.svg",
  },
  {
    id: "general-spark",
    label: "Chispa inteligente",
    categoryId: "general",
    imagePath: "/assistant-avatars/general-spark.svg",
  },
  {
    id: "general-wave",
    label: "Asistente clásico",
    categoryId: "general",
    imagePath: "/assistant-avatars/general-wave.svg",
  },
  {
    id: "tech-bot",
    label: "Bot tecnológico",
    categoryId: "tech",
    imagePath: "/assistant-avatars/tech-bot.svg",
    suggestedRubros: ["tecnologia"],
  },
  {
    id: "tech-chip",
    label: "Chip digital",
    categoryId: "tech",
    imagePath: "/assistant-avatars/tech-chip.svg",
    suggestedRubros: ["tecnologia"],
  },
  {
    id: "anime-neo",
    label: "Neo anime",
    categoryId: "anime",
    imagePath: "/assistant-avatars/anime-neo.svg",
    suggestedRubros: ["coleccionables"],
  },
  {
    id: "anime-sakura",
    label: "Sakura kawaii",
    categoryId: "anime",
    imagePath: "/assistant-avatars/anime-sakura.svg",
    suggestedRubros: ["coleccionables"],
  },
  {
    id: "fashion-chic",
    label: "Estilista chic",
    categoryId: "fashion",
    imagePath: "/assistant-avatars/fashion-chic.svg",
    suggestedRubros: ["ropa-moda"],
  },
  {
    id: "fashion-glam",
    label: "Glam boutique",
    categoryId: "fashion",
    imagePath: "/assistant-avatars/fashion-glam.svg",
    suggestedRubros: ["ropa-moda"],
  },
  {
    id: "food-chef",
    label: "Chef experto",
    categoryId: "food",
    imagePath: "/assistant-avatars/food-chef.svg",
    suggestedRubros: ["alimentos"],
  },
  {
    id: "food-fresh",
    label: "Frescura natural",
    categoryId: "food",
    imagePath: "/assistant-avatars/food-fresh.svg",
    suggestedRubros: ["alimentos"],
  },
  {
    id: "wellness-leaf",
    label: "Bienestar natural",
    categoryId: "wellness",
    imagePath: "/assistant-avatars/wellness-leaf.svg",
    suggestedRubros: ["salud-belleza"],
  },
  {
    id: "wellness-glow",
    label: "Glow beauty",
    categoryId: "wellness",
    imagePath: "/assistant-avatars/wellness-glow.svg",
    suggestedRubros: ["salud-belleza"],
  },
  {
    id: "office-pen",
    label: "Asistente de oficina",
    categoryId: "office",
    imagePath: "/assistant-avatars/office-pen.svg",
    suggestedRubros: ["papeleria-libreria-oficina"],
  },
  {
    id: "office-note",
    label: "Notas útiles",
    categoryId: "office",
    imagePath: "/assistant-avatars/office-note.svg",
    suggestedRubros: ["papeleria-libreria-oficina"],
  },
  {
    id: "collectibles-star",
    label: "Estrella coleccionista",
    categoryId: "collectibles",
    imagePath: "/assistant-avatars/collectibles-star.svg",
    suggestedRubros: ["coleccionables"],
  },
  {
    id: "collectibles-mask",
    label: "Máscara heroica",
    categoryId: "collectibles",
    imagePath: "/assistant-avatars/collectibles-mask.svg",
    suggestedRubros: ["coleccionables"],
  },
];

const PRESET_BY_ID = new Map(
  ASSISTANT_AVATAR_PRESETS.map((preset) => [preset.id, preset]),
);

export function getAssistantAvatarPreset(
  presetId: string,
): AssistantAvatarPreset | undefined {
  return PRESET_BY_ID.get(presetId);
}

export function getAssistantAvatarCategoriesForRubro(
  storeRubro: string | null | undefined,
): AssistantAvatarCategory[] {
  const rubro = storeRubro?.trim();
  if (!rubro) {
    return ASSISTANT_AVATAR_CATEGORIES;
  }

  const suggested = ASSISTANT_AVATAR_PRESETS.filter((preset) =>
    preset.suggestedRubros?.includes(rubro as StoreRubro),
  );
  if (suggested.length === 0) {
    return ASSISTANT_AVATAR_CATEGORIES;
  }

  const suggestedCategoryIds = new Set(
    suggested.map((preset) => preset.categoryId),
  );
  const general = ASSISTANT_AVATAR_CATEGORIES.filter(
    (category) => category.id === "general",
  );
  const highlighted = ASSISTANT_AVATAR_CATEGORIES.filter(
    (category) =>
      category.id !== "general" && suggestedCategoryIds.has(category.id),
  );
  const rest = ASSISTANT_AVATAR_CATEGORIES.filter(
    (category) =>
      category.id !== "general" && !suggestedCategoryIds.has(category.id),
  );

  return [...general, ...highlighted, ...rest];
}

export function getAssistantAvatarPresetsByCategory(
  categoryId: AssistantAvatarCategoryId,
): AssistantAvatarPreset[] {
  return ASSISTANT_AVATAR_PRESETS.filter(
    (preset) => preset.categoryId === categoryId,
  );
}
