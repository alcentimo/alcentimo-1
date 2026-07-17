export const ORDER_ESTADOS = [
  "pendiente",
  "verificando",
  "en_preparacion",
  "enviado",
  "entregado",
  "cancelado",
] as const;

export type OrderEstado = (typeof ORDER_ESTADOS)[number];

export const ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  pendiente: "Pendiente",
  verificando: "Verificando",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDER_ESTADO_BADGE_CLASS: Record<OrderEstado, string> = {
  pendiente:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  verificando:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
  en_preparacion:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
  enviado:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
  entregado:
    "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300",
  cancelado:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
};

export type OrderFilterId = "all" | "today" | "dispatch" | "pending" | "completed";

export function isDispatchPendingEstado(estado: OrderEstado): boolean {
  return (
    estado === "pendiente" ||
    estado === "verificando" ||
    estado === "en_preparacion"
  );
}

export function isValidOrderEstado(value: string): value is OrderEstado {
  return (ORDER_ESTADOS as readonly string[]).includes(value);
}

export function isPendingOrderEstado(estado: OrderEstado): boolean {
  return estado !== "entregado" && estado !== "cancelado";
}

export function isCompletedOrderEstado(estado: OrderEstado): boolean {
  return estado === "entregado";
}

export function matchesOrderFilter(
  estado: OrderEstado,
  filter: OrderFilterId,
): boolean {
  if (filter === "all" || filter === "today") return true;
  if (filter === "dispatch") return isDispatchPendingEstado(estado);
  if (filter === "pending") return isPendingOrderEstado(estado);
  return isCompletedOrderEstado(estado);
}
