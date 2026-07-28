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
 * Tallas de calzado EUR (numéricas).
 * Compatibles con la misma matriz talla × color que la ropa.
 */
export const ROPA_MODA_SHOE_SIZE_EUR_PRESETS = [
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
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

export const ROPA_MODA_ATTR_TALLA = "talla";
export const ROPA_MODA_ATTR_COLOR = "color";
