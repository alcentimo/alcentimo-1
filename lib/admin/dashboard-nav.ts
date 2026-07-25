export type AdminDashboardTab =
  | "resumen"
  | "pagos"
  | "tiendas"
  | "planes"
  | "soporte";

const LEGACY_TAB_MAP: Record<string, AdminDashboardTab> = {
  resumen: "resumen",
  pagos: "pagos",
  tiendas: "tiendas",
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

export type AdminStoresSubTab =
  | "usuarios"
  | "dominios"
  | "sucursales"
  | "promociones";

export function resolveAdminStoresSubTab(
  legacyTab: string | null | undefined,
): AdminStoresSubTab {
  if (legacyTab === "dominios") return "dominios";
  if (legacyTab === "sucursales") return "sucursales";
  return "usuarios";
}
