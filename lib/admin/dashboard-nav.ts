export type AdminDashboardTab =
  | "dropship"
  | "proveedor"
  | "tiendas"
  | "soporte"
  | "ia";

const DEFAULT_TAB: AdminDashboardTab = "tiendas";

const LEGACY_TAB_MAP: Record<string, AdminDashboardTab> = {
  dropship: "dropship",
  liquidaciones: "dropship",
  "liquidaciones-dropship": "dropship",
  proveedor: "proveedor",
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
  dominios: "tiendas",
  sucursales: "tiendas",
  soporte: "soporte",
  ia: "ia",
  asistente: "ia",
  "ia-gerencial": "ia",
  // Secciones retiradas del panel: redirigen al directorio.
  resumen: "tiendas",
  pagos: "tiendas",
  cupones: "tiendas",
  promociones: "tiendas",
  planes: "tiendas",
  metricas: "tiendas",
  configuracion: "tiendas",
  plataforma: "tiendas",
  envios: "tiendas",
  shipping: "tiendas",
};

export function resolveAdminDashboardTab(
  value: string | null | undefined,
): AdminDashboardTab {
  if (!value) return DEFAULT_TAB;
  return LEGACY_TAB_MAP[value] ?? DEFAULT_TAB;
}

export type AdminStoresSubTab =
  | "dropshippers"
  | "proveedores"
  | "dominios"
  | "sucursales";

export function resolveAdminStoresSubTab(
  legacyTab: string | null | undefined,
  section?: string | null,
): AdminStoresSubTab {
  const value = section || legacyTab;
  if (value === "proveedores") return "proveedores";
  if (value === "dominios") return "dominios";
  if (value === "sucursales") return "sucursales";
  return "dropshippers";
}
