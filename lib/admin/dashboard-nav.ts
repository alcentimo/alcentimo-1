export type AdminDashboardTab =
  | "dropship"
  | "proveedor"
  | "marcas"
  | "tiendas"
  | "envios"
  | "soporte"
  | "ia";

const DEFAULT_TAB: AdminDashboardTab = "tiendas";

const LEGACY_TAB_MAP: Record<string, AdminDashboardTab> = {
  dropship: "dropship",
  liquidaciones: "dropship",
  "liquidaciones-dropship": "dropship",
  proveedor: "proveedor",
  marcas: "marcas",
  "marcas-destacadas": "marcas",
  mayorista: "proveedor",
  "proveedor-mayorista": "proveedor",
  catalogo: "proveedor",
  "catalogo-mayorista": "proveedor",
  tiendas: "tiendas",
  comunidad: "tiendas",
  directorio: "tiendas",
  crecimiento: "tiendas",
  dropshippers: "tiendas",
  proveedores: "tiendas",
  usuarios: "tiendas",
  dominios: "tiendas",
  sucursales: "tiendas",
  envios: "envios",
  shipping: "envios",
  "envio-gratis": "envios",
  soporte: "soporte",
  ia: "ia",
  asistente: "ia",
  "ia-gerencial": "ia",
  resumen: "tiendas",
  pagos: "tiendas",
  cupones: "tiendas",
  promociones: "tiendas",
  planes: "tiendas",
  metricas: "tiendas",
  configuracion: "tiendas",
  plataforma: "tiendas",
};

export function resolveAdminDashboardTab(
  value: string | null | undefined,
): AdminDashboardTab {
  if (!value) return DEFAULT_TAB;
  return LEGACY_TAB_MAP[value] ?? DEFAULT_TAB;
}

export type AdminStoresSubTab = "proveedores" | "dropshippers";

export function resolveAdminStoresSubTab(
  legacyTab: string | null | undefined,
  section?: string | null,
): AdminStoresSubTab {
  const value = section || legacyTab;
  if (value === "dropshippers" || value === "usuarios") return "dropshippers";
  return "proveedores";
}
