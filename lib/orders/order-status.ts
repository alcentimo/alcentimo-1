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
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
  verificando:
    "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-950/40 dark:text-yellow-200",
  en_preparacion:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
  enviado:
    "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200",
  entregado:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  cancelado:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
};

export const ORDER_ESTADO_DOT_CLASS: Record<OrderEstado, string> = {
  pendiente: "bg-amber-500",
  verificando: "bg-yellow-400",
  en_preparacion: "bg-blue-500",
  enviado: "bg-violet-500",
  entregado: "bg-emerald-500",
  cancelado: "bg-zinc-400",
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
