export type AdminDashboardTab =
  | "resumen"
  | "pagos"
  | "dropship"
  | "proveedor"
  | "tiendas"
  | "cupones"
  | "planes"
  | "soporte"
  | "ia";

const LEGACY_TAB_MAP: Record<string, AdminDashboardTab> = {
  resumen: "resumen",
  pagos: "pagos",
  dropship: "dropship",
  liquidaciones: "dropship",
  "liquidaciones-dropship": "dropship",
  proveedor: "proveedor",
  mayorista: "proveedor",
  "proveedor-mayorista": "proveedor",
  catalogo: "proveedor",
  "catalogo-mayorista": "proveedor",
  tiendas: "tiendas",
  cupones: "cupones",
  promociones: "cupones",
  planes: "planes",
  soporte: "soporte",
  ia: "ia",
  asistente: "ia",
  "ia-gerencial": "ia",
  metricas: "resumen",
  crecimiento: "tiendas",
  dominios: "tiendas",
  sucursales: "tiendas",
  configuracion: "planes",
  plataforma: "planes",
  envios: "planes",
  shipping: "planes",
};

export function resolveAdminDashboardTab(
  value: string | null | undefined,
): AdminDashboardTab {
  if (!value) return "resumen";
  return LEGACY_TAB_MAP[value] ?? "resumen";
}

export type AdminPlansSubTab =
  | "planes"
  | "pagos-config"
  | "plataforma"
  | "envios";

export function resolveAdminPlansSubTab(
  value: string | null | undefined,
): AdminPlansSubTab {
  if (value === "pagos-config" || value === "pagos") return "pagos-config";
  if (value === "plataforma" || value === "marca" || value === "brand") {
    return "plataforma";
  }
  if (value === "envios" || value === "shipping" || value === "envíos") {
    return "envios";
  }
  return "planes";
}

export type AdminStoresSubTab = "usuarios" | "dominios" | "sucursales";

export function resolveAdminStoresSubTab(
  legacyTab: string | null | undefined,
): AdminStoresSubTab {
  if (legacyTab === "dominios") return "dominios";
  if (legacyTab === "sucursales") return "sucursales";
  return "usuarios";
}
