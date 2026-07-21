/** Rutas del dashboard que admiten prefetch de datos en segundo plano. */
export type DashboardPrefetchRoute =
  | "catalogo"
  | "pedidos"
  | "clientes"
  | "analiticas"
  | "ajustes";

const ROUTE_PREFIXES: Array<{ prefix: string; route: DashboardPrefetchRoute }> = [
  { prefix: "/dashboard/catalogo", route: "catalogo" },
  { prefix: "/dashboard/pedidos", route: "pedidos" },
  { prefix: "/dashboard/clientes", route: "clientes" },
  { prefix: "/dashboard/analiticas", route: "analiticas" },
  { prefix: "/dashboard/ajustes", route: "ajustes" },
];

/** Resuelve un href del menú lateral a la clave de prefetch, si aplica. */
export function resolveDashboardPrefetchRoute(
  href: string,
): DashboardPrefetchRoute | null {
  const normalized = href.split("?")[0]?.split("#")[0] ?? href;

  for (const { prefix, route } of ROUTE_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return route;
    }
  }

  return null;
}

export function isDashboardPrefetchRoute(
  value: string | null | undefined,
): value is DashboardPrefetchRoute {
  return (
    value === "catalogo" ||
    value === "pedidos" ||
    value === "clientes" ||
    value === "analiticas" ||
    value === "ajustes"
  );
}
