import type { CatalogListItem } from "@/lib/database.types";

export const PC_BUILDER_SLOT_ORDER = [
  "cpu",
  "motherboard",
  "ram",
  "storage",
  "gpu",
  "psu",
  "case",
] as const;

export type PCBuilderSlotId = (typeof PC_BUILDER_SLOT_ORDER)[number];

export interface PCBuilderSlotDefinition {
  id: PCBuilderSlotId;
  label: string;
  shortLabel: string;
  description: string;
  categorySlugs: readonly string[];
}

export const PC_BUILDER_SLOTS: PCBuilderSlotDefinition[] = [
  {
    id: "cpu",
    label: "Procesador",
    shortLabel: "CPU",
    description: "El cerebro de tu PC.",
    categorySlugs: ["procesadores", "procesador", "cpu"],
  },
  {
    id: "motherboard",
    label: "Tarjeta madre",
    shortLabel: "Motherboard",
    description: "Conecta todos los componentes.",
    categorySlugs: ["tarjetas-madre", "placa-madre", "motherboard"],
  },
  {
    id: "ram",
    label: "Memoria RAM",
    shortLabel: "RAM",
    description: "Velocidad para multitarea y juegos.",
    categorySlugs: ["memorias-ram", "ram", "memoria-ram"],
  },
  {
    id: "storage",
    label: "Almacenamiento",
    shortLabel: "SSD / HDD",
    description: "Espacio para sistema, apps y archivos.",
    categorySlugs: [
      "almacenamiento-pc",
      "almacenamiento",
      "ssd",
      "discos",
      "storage",
    ],
  },
  {
    id: "gpu",
    label: "Tarjeta gráfica",
    shortLabel: "GPU",
    description: "Rendimiento gráfico y gaming.",
    categorySlugs: ["tarjetas-graficas", "gpu", "graficas", "video"],
  },
  {
    id: "psu",
    label: "Fuente de poder",
    shortLabel: "PSU",
    description: "Energía estable para tu ensamblaje.",
    categorySlugs: ["fuentes-poder", "fuentes", "psu", "power-supply"],
  },
  {
    id: "case",
    label: "Gabinete",
    shortLabel: "Case",
    description: "Chasis, airflow y estética.",
    categorySlugs: ["gabinetes", "gabinete", "case", "chasis"],
  },
];

const SLOT_BY_ID = new Map(PC_BUILDER_SLOTS.map((slot) => [slot.id, slot]));

const CATEGORY_TO_SLOT = new Map<string, PCBuilderSlotId>();
for (const slot of PC_BUILDER_SLOTS) {
  for (const slug of slot.categorySlugs) {
    CATEGORY_TO_SLOT.set(slug, slot.id);
  }
}

export type PCBuilderSelection = Partial<Record<PCBuilderSlotId, CatalogListItem>>;

function readMetadataSlot(
  metadata: Record<string, unknown> | null | undefined,
): PCBuilderSlotId | null {
  const raw = metadata?.pc_builder_slot;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  return SLOT_BY_ID.has(normalized as PCBuilderSlotId)
    ? (normalized as PCBuilderSlotId)
    : null;
}

/** Determina el slot de PC Builder de un producto (metadata o categoría). */
export function resolvePCBuilderSlot(
  product: Pick<CatalogListItem, "category_slug" | "metadata">,
): PCBuilderSlotId | null {
  const fromMetadata = readMetadataSlot(product.metadata ?? null);
  if (fromMetadata) return fromMetadata;

  const slug = product.category_slug?.trim().toLowerCase();
  if (!slug) return null;
  return CATEGORY_TO_SLOT.get(slug) ?? null;
}

export function getPCBuilderSlotDefinition(
  slotId: PCBuilderSlotId,
): PCBuilderSlotDefinition {
  return SLOT_BY_ID.get(slotId)!;
}

export function filterProductsForPCBuilderSlot(
  products: CatalogListItem[],
  slotId: PCBuilderSlotId,
): CatalogListItem[] {
  return products.filter((product) => resolvePCBuilderSlot(product) === slotId);
}

export function indexProductsByPCBuilderSlot(
  products: CatalogListItem[],
): Record<PCBuilderSlotId, CatalogListItem[]> {
  const indexed = Object.fromEntries(
    PC_BUILDER_SLOT_ORDER.map((slotId) => [slotId, [] as CatalogListItem[]]),
  ) as Record<PCBuilderSlotId, CatalogListItem[]>;

  for (const product of products) {
    const slotId = resolvePCBuilderSlot(product);
    if (!slotId) continue;
    indexed[slotId].push(product);
  }

  for (const slotId of PC_BUILDER_SLOT_ORDER) {
    indexed[slotId].sort((a, b) => a.product_name.localeCompare(b.product_name, "es"));
  }

  return indexed;
}

export function resolvePCBuilderProductPriceUsd(product: CatalogListItem): number {
  return product.price_usd ?? 0;
}

export function calculatePCBuilderTotalUsd(
  selection: PCBuilderSelection,
): number {
  return PC_BUILDER_SLOT_ORDER.reduce((total, slotId) => {
    const product = selection[slotId];
    if (!product) return total;
    return total + resolvePCBuilderProductPriceUsd(product);
  }, 0);
}

export function countPCBuilderSelections(selection: PCBuilderSelection): number {
  return PC_BUILDER_SLOT_ORDER.filter((slotId) => selection[slotId]).length;
}

export function isPCBuilderComplete(selection: PCBuilderSelection): boolean {
  return countPCBuilderSelections(selection) === PC_BUILDER_SLOT_ORDER.length;
}
