import type { StoreRubro } from "@/src/config/categories";

/**
 * Módulos de producto activos. Solo los listados aquí se cargan en runtime
 * (lazy) cuando la tienda tiene ese rubro. Añadir un rubro aquí no importa
 * su código; el import dinámico ocurre en el loader del módulo.
 */
export type RubroProductModuleId =
  | "ropa-moda"
  | "alimentos"
  | "tecnologia"
  | "coleccionables"
  | "salud-belleza"
  | "papeleria-libreria-oficina";

/** Registro ligero: no importa componentes ni datos pesados. */
export const ACTIVE_RUBRO_PRODUCT_MODULES: Partial<
  Record<StoreRubro, RubroProductModuleId>
> = {
  "ropa-moda": "ropa-moda",
  alimentos: "alimentos",
  tecnologia: "tecnologia",
  coleccionables: "coleccionables",
  "salud-belleza": "salud-belleza",
  "papeleria-libreria-oficina": "papeleria-libreria-oficina",
};

/** Campos que el módulo de variantes/specs sustituye (no mostrar como texto libre genérico). */
export const RUBRO_MODULE_MANAGED_EXTRA_FIELDS: Record<
  RubroProductModuleId,
  readonly string[]
> = {
  "ropa-moda": ["Talla", "Color", "Material", "Género"],
  alimentos: [
    "Marca",
    "Peso/Volumen",
    "Presentación",
    "Volumen",
    "Sabor",
    "Origen",
  ],
  tecnologia: [
    "Almacenamiento",
    "Memoria RAM",
    "Color",
    "Compatibilidad",
    "Pantalla",
    "Modelo compatible",
    "Marca",
    "Socket",
    "Núcleos",
    "Frecuencia",
    "TDP",
    "Chipset",
    "Factor de forma",
    "Capacidad",
    "Tipo",
    "Interfaz",
    "VRAM",
    "Potencia",
    "Certificación",
    "Modular",
  ],
  coleccionables: [
    "Condición",
    "Edición / Rareza",
    "Preventa",
    "Llegada estimada",
  ],
  "salud-belleza": [
    "Presentación",
    "Volumen",
    "Tono",
    "Color",
    "Tipo de piel",
    "Ingredientes clave",
  ],
  "papeleria-libreria-oficina": [
    "Marca",
    "Presentación",
    "Segmento",
    "Formato / Tamaño",
    "Color",
    "Modelo / Referencia",
    "Gramaje",
    "Tipo de hoja",
    "Unidades por empaque",
  ],
};

/** El rubro define el giro; la categoría de producto se pide cuando aporta (p. ej. PC Builder). */
export const RUBRO_MODULE_HIDES_CATEGORY: Record<RubroProductModuleId, boolean> = {
  "ropa-moda": true,
  alimentos: true,
  /** Tecnología necesita categoría (celulares vs procesadores) para specs y Arma tu PC. */
  tecnologia: false,
  coleccionables: true,
  "salud-belleza": true,
  "papeleria-libreria-oficina": false,
};
