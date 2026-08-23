import {
  SUPPLIER_PRODUCT_CATEGORIES,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";

const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  electronica: [
    "celular",
    "telefono",
    "smartphone",
    "laptop",
    "audifono",
    "auricular",
    "cargador",
    "tablet",
    "televisor",
    "mouse",
    "teclado",
  ],
  hogar: [
    "saban",
    "toalla",
    "almohada",
    "sarten",
    "olla",
    "lampara",
    "cojin",
    "cortina",
    "cocina",
  ],
  belleza: [
    "labial",
    "maquillaje",
    "crema",
    "shampoo",
    "champu",
    "serum",
    "perfume",
    "esmalte",
    "skincare",
  ],
  accesorios: [
    "collar",
    "pulsera",
    "arete",
    "reloj",
    "billetera",
    "cartera",
    "gorra",
    "cinturon",
    "lentes",
  ],
  alimentos: [
    "snack",
    "cafe",
    "galleta",
    "aceite",
    "harina",
    "arroz",
    "chocolate",
    "bebida",
    "jugo",
    "salsa",
  ],
  ropa: [
    "camisa",
    "camiseta",
    "pantalon",
    "jean",
    "vestido",
    "blusa",
    "falda",
    "hoodie",
    "sudadera",
    "chaqueta",
    "zapato",
    "tennis",
    "tenis",
    "zapatilla",
    "polo",
    "ropa",
    "short",
    "legging",
  ],
  salud: ["vitamina", "suplemento", "termometro", "antibacterial", "farmacia"],
  juguetes: [
    "juguete",
    "muneca",
    "lego",
    "peluche",
    "rompecabezas",
    "didactico",
  ],
  papeleria: [
    "cuaderno",
    "lapiz",
    "boligrafo",
    "resma",
    "folder",
    "marcador",
    "libreta",
  ],
  automotriz: ["bateria", "caucho", "filtro", "automotriz", "motor"],
  otros: [],
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Detecta categoría mayorista a partir de palabras del título. */
export function detectSupplierCategoryFromTitle(
  title: string,
): SupplierProductCategory | null {
  const normalized = normalizeText(title);
  if (normalized.length < 4) return null;

  let best: { category: SupplierProductCategory; score: number } | null = null;

  for (const item of SUPPLIER_PRODUCT_CATEGORIES) {
    if (item.value === "otros") continue;
    let score = 0;
    const label = normalizeText(item.label);
    if (label.length >= 4 && normalized.includes(label)) score += 4;
    for (const keyword of CATEGORY_KEYWORDS[item.value] ?? []) {
      const kw = normalizeText(keyword);
      if (kw.length >= 3 && normalized.includes(kw)) score += 2;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: item.value, score };
    }
  }

  return best && best.score >= 2 ? best.category : null;
}
