/** Presets ligeros del módulo Ropa y Moda (sin componentes React). */

export const ROPA_MODA_MODULE_ID = "ropa-moda" as const;

/** Tallas de prenda (letras). */
export const ROPA_MODA_SIZE_PRESETS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;

/**
 * Tallas numéricas de pantalones y jeans (cintura).
 * Misma matriz talla × color que ropa y calzado.
 */
export const ROPA_MODA_PANTS_SIZE_PRESETS = [
  "28",
  "30",
  "32",
  "34",
  "36",
] as const;

/**
 * Tallas de calzado EUR (etiquetadas para no confundir con pantalones 28–36).
 * Compatibles con la misma matriz talla × color que la ropa.
 */
export const ROPA_MODA_SHOE_SIZE_EUR_PRESETS = [
  "EUR 34",
  "EUR 35",
  "EUR 36",
  "EUR 37",
  "EUR 38",
  "EUR 39",
  "EUR 40",
  "EUR 41",
  "EUR 42",
  "EUR 43",
  "EUR 44",
  "EUR 45",
] as const;

/** Tallas de calzado US (etiquetadas para no confundir con EUR). */
export const ROPA_MODA_SHOE_SIZE_US_PRESETS = [
  "US 5",
  "US 6",
  "US 7",
  "US 8",
  "US 9",
  "US 10",
  "US 11",
  "US 12",
] as const;

/** Todos los presets de talla (ropa + pantalones + calzado) para chips y validación. */
export const ROPA_MODA_ALL_SIZE_PRESETS = [
  ...ROPA_MODA_SIZE_PRESETS,
  ...ROPA_MODA_PANTS_SIZE_PRESETS,
  ...ROPA_MODA_SHOE_SIZE_EUR_PRESETS,
  ...ROPA_MODA_SHOE_SIZE_US_PRESETS,
] as const;

/**
 * Equivalencia orientativa: longitud del pie / plantilla interna (cm).
 * Valores de referencia; el comerciante puede ajustarlos por marca.
 * Incluye claves legacy numéricas (34–45) por productos guardados antes del prefijo EUR.
 */
export const ROPA_MODA_SHOE_SIZE_CM_GUIDE: Readonly<Record<string, string>> = {
  "EUR 34": "21.5",
  "EUR 35": "22.0",
  "EUR 36": "22.5",
  "EUR 37": "23.5",
  "EUR 38": "24.0",
  "EUR 39": "24.5",
  "EUR 40": "25.0",
  "EUR 41": "26.0",
  "EUR 42": "26.5",
  "EUR 43": "27.5",
  "EUR 44": "28.0",
  "EUR 45": "29.0",
  "34": "21.5",
  "35": "22.0",
  "36": "22.5",
  "37": "23.5",
  "38": "24.0",
  "39": "24.5",
  "40": "25.0",
  "41": "26.0",
  "42": "26.5",
  "43": "27.5",
  "44": "28.0",
  "45": "29.0",
  "US 5": "23.0",
  "US 6": "24.0",
  "US 7": "25.0",
  "US 8": "26.0",
  "US 9": "27.0",
  "US 10": "28.0",
  "US 11": "29.0",
  "US 12": "30.0",
};

export const ROPA_MODA_COLOR_PRESETS = [
  "Negro",
  "Blanco",
  "Gris",
  "Azul",
  "Rojo",
  "Beige",
  "Verde",
  "Rosa",
] as const;

/** Colores CSS para swatches del catálogo público. */
export const ROPA_MODA_COLOR_SWATCHES: Readonly<Record<string, string>> = {
  Negro: "#171717",
  Blanco: "#f4f4f5",
  Gris: "#a1a1aa",
  Azul: "#2563eb",
  Rojo: "#dc2626",
  Beige: "#d6c3a8",
  Verde: "#16a34a",
  Rosa: "#ec4899",
};

export function getFashionColorSwatch(color: string): string | null {
  const trimmed = color.trim();
  if (!trimmed) return null;
  if (ROPA_MODA_COLOR_SWATCHES[trimmed]) return ROPA_MODA_COLOR_SWATCHES[trimmed];
  const match = Object.entries(ROPA_MODA_COLOR_SWATCHES).find(
    ([key]) => key.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.[1] ?? null;
}

export const ROPA_MODA_ATTR_TALLA = "talla";
export const ROPA_MODA_ATTR_COLOR = "color";
/** Longitud del pie / plantilla interna en centímetros (calzado). */
export const ROPA_MODA_ATTR_LONGITUD_CM = "longitud_cm";

/**
 * Tipo de producto dentro del rubro único "Ropa, Calzado y Moda".
 * No crea rubros de tienda separados: solo filtra el formulario.
 */
export type FashionProductKind = "ropa" | "calzado" | "ambos";

export const FASHION_PRODUCT_KIND_OPTIONS: ReadonlyArray<{
  value: FashionProductKind;
  label: string;
  description: string;
}> = [
  {
    value: "ropa",
    label: "Ropa",
    description: "Tallas de prenda y colores",
  },
  {
    value: "calzado",
    label: "Calzado",
    description: "Numeraciones EUR / US y colores",
  },
  {
    value: "ambos",
    label: "Ambos",
    description: "Ropa y calzado en el mismo producto",
  },
];

const PANTS_SIZE_SET = new Set<string>(ROPA_MODA_PANTS_SIZE_PRESETS);
const SHOE_SIZE_SET = new Set<string>([
  ...ROPA_MODA_SHOE_SIZE_EUR_PRESETS,
  ...ROPA_MODA_SHOE_SIZE_US_PRESETS,
]);
const CLOTHING_LETTER_SIZE_SET = new Set<string>(
  ROPA_MODA_SIZE_PRESETS.map((size) => size.toLowerCase()),
);

function normalizeSizeKey(size: string): string {
  return size.trim().toLowerCase();
}

/** True si la talla es de calzado EUR/US (no ropa ni pantalones). */
export function isFashionShoeSize(size: string): boolean {
  const trimmed = size.trim();
  if (!trimmed) return false;
  if (SHOE_SIZE_SET.has(trimmed)) return true;
  if (/^us\s*\d+(\.\d+)?$/i.test(trimmed)) return true;
  if (/^eur\s*\d+(\.\d+)?$/i.test(trimmed)) return true;
  // Legacy EUR numérico (sin prefijo): no confundir con cintura de pantalón 28–36.
  if (/^\d{2}(\.\d+)?$/.test(trimmed)) {
    if (PANTS_SIZE_SET.has(trimmed) && !trimmed.includes(".")) return false;
    const n = parseFloat(trimmed);
    return n >= 34 && n <= 50;
  }
  return false;
}

/** True si la talla es de ropa/pantalones (no calzado). */
export function isFashionClothingSize(size: string): boolean {
  const trimmed = size.trim();
  if (!trimmed) return false;
  if (isFashionShoeSize(trimmed)) return false;
  if (CLOTHING_LETTER_SIZE_SET.has(normalizeSizeKey(trimmed))) return true;
  if (PANTS_SIZE_SET.has(trimmed)) return true;
  // Tallas personalizadas de prenda (XXS, 3XL, etc.)
  return true;
}

/** Infiere el tipo de producto a partir de las tallas ya guardadas. */
export function inferFashionProductKind(
  sizes: readonly string[],
): FashionProductKind {
  if (sizes.length === 0) return "ropa";
  const hasShoe = sizes.some((size) => isFashionShoeSize(size));
  const hasClothing = sizes.some((size) => !isFashionShoeSize(size));
  if (hasShoe && hasClothing) return "ambos";
  if (hasShoe) return "calzado";
  return "ropa";
}

/** Filtra tallas según el tipo de producto seleccionado. */
export function filterSizesForFashionKind(
  sizes: readonly string[],
  kind: FashionProductKind,
): string[] {
  if (kind === "ropa") {
    return sizes.filter((size) => !isFashionShoeSize(size));
  }
  if (kind === "calzado") {
    return sizes.filter((size) => isFashionShoeSize(size));
  }
  return [...sizes];
}

/** Cm sugeridos para una talla de calzado, o null si no hay referencia. */
export function getDefaultShoeLengthCm(size: string): string | null {
  const trimmed = size.trim();
  if (!trimmed) return null;
  if (ROPA_MODA_SHOE_SIZE_CM_GUIDE[trimmed]) {
    return ROPA_MODA_SHOE_SIZE_CM_GUIDE[trimmed];
  }
  const match = Object.entries(ROPA_MODA_SHOE_SIZE_CM_GUIDE).find(
    ([key]) => normalizeSizeKey(key) === normalizeSizeKey(trimmed),
  );
  if (match) return match[1];

  // "EUR 40" ↔ guía "40" / "EUR 40"
  const eurMatch = trimmed.match(/^eur\s*(\d+(\.\d+)?)$/i);
  if (eurMatch) {
    return (
      ROPA_MODA_SHOE_SIZE_CM_GUIDE[`EUR ${eurMatch[1]}`] ??
      ROPA_MODA_SHOE_SIZE_CM_GUIDE[eurMatch[1]] ??
      null
    );
  }

  return null;
}

/** Normaliza un valor de cm editable (opcional). */
export function normalizeShoeLengthCm(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 50) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
