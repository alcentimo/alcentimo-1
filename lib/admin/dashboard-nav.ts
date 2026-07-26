export type AdminDashboardTab =
  | "resumen"
  | "pagos"
  | "tiendas"
  | "cupones"
  | "planes"
  | "soporte";

const LEGACY_TAB_MAP: Record<string, AdminDashboardTab> = {
  resumen: "resumen",
  pagos: "pagos",
  tiendas: "tiendas",
  cupones: "cupones",
  promociones: "cupones",
  planes: "planes",
  soporte: "soporte",
  metricas: "resumen",
  crecimiento: "tiendas",
  dominios: "tiendas",
  sucursales: "tiendas",
  configuracion: "planes",
  plataforma: "planes",
};

export function resolveAdminDashboardTab(
  value: string | null | undefined,
): AdminDashboardTab {
  if (!value) return "resumen";
  return LEGACY_TAB_MAP[value] ?? "resumen";
}

export type AdminPlansSubTab = "planes" | "pagos-config" | "plataforma";

export function resolveAdminPlansSubTab(
  value: string | null | undefined,
): AdminPlansSubTab {
  if (value === "pagos-config" || value === "pagos") return "pagos-config";
  if (value === "plataforma" || value === "marca" || value === "brand") {
    return "plataforma";
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
