/** Destino de visitas: landing SaaS o catálogo de una tienda. */
export const LANDING_PAGE_TARGET_KEY = "landing_page" as const;

export type PageVisitTargetKey = typeof LANDING_PAGE_TARGET_KEY | string;

export const LANDING_VISITOR_COOKIE = "alcentimo_lv";

export function storePageVisitTargetKey(storeId: string): string {
  return storeId.trim().toLowerCase();
}

/** Fecha local America/Caracas (YYYY-MM-DD). */
export function getAlcentimoLocalDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Primer día del mes local (YYYY-MM-DD). */
export function getAlcentimoMonthStart(date = new Date()): string {
  const today = getAlcentimoLocalDate(date);
  return `${today.slice(0, 7)}-01`;
}
