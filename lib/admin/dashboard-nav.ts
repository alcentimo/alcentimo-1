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
  crecimiento: "tiendas",
  dominios: "tiendas",
  sucursales: "tiendas",
  soporte: "soporte",
  ia: "ia",
  asistente: "ia",
  "ia-gerencial": "ia",
  // Secciones retiradas del panel: redirigen a Tiendas y usuarios.
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

export type AdminStoresSubTab = "usuarios" | "dominios" | "sucursales";

export function resolveAdminStoresSubTab(
  legacyTab: string | null | undefined,
): AdminStoresSubTab {
  if (legacyTab === "dominios") return "dominios";
  if (legacyTab === "sucursales") return "sucursales";
  return "usuarios";
}
