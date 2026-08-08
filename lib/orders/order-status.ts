export const ORDER_ESTADOS = [
  "por_pagar",
  "pendiente",
  "procesando",
  "enviado",
  "entregado",
  "cancelado",
] as const;

export type OrderEstado = (typeof ORDER_ESTADOS)[number];

/** Estados legacy que se normalizan a `procesando`. */
const LEGACY_TO_PROCESANDO = new Set(["verificando", "en_preparacion"]);

export const ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  por_pagar: "Pendiente de pago",
  pendiente: "Pendiente de verificación",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/** Etiquetas orientadas al comprador final (catálogo / Mis compras). */
export const CUSTOMER_ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  por_pagar: "Pendiente de pago",
  pendiente: "En espera de verificación",
  procesando: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const CUSTOMER_ORDER_ESTADO_HINTS: Record<OrderEstado, string> = {
  por_pagar: "Sube el comprobante para que la tienda verifique tu pago.",
  pendiente: "La tienda está revisando tu pago.",
  procesando: "Pago confirmado. Están preparando tu pedido.",
  enviado: "Tu pedido ya salió. Revisa la guía si aplica.",
  entregado: "Pedido completado.",
  cancelado: "Este pedido fue anulado.",
};

/** Pasos del seguimiento (sin cancelado). */
export const CUSTOMER_ORDER_STATUS_STEPS = [
  "por_pagar",
  "pendiente",
  "procesando",
  "enviado",
  "entregado",
] as const satisfies readonly OrderEstado[];

export type CustomerOrderStatusStep =
  (typeof CUSTOMER_ORDER_STATUS_STEPS)[number];

export function getCustomerOrderEstadoLabel(estado: OrderEstado): string {
  return CUSTOMER_ORDER_ESTADO_LABELS[estado];
}

/** Índice del paso actual en la línea de tiempo (cancelado → -1). */
export function getCustomerOrderStatusStepIndex(estado: OrderEstado): number {
  if (estado === "cancelado") return -1;
  return CUSTOMER_ORDER_STATUS_STEPS.indexOf(
    estado as CustomerOrderStatusStep,
  );
}

/** Texto corto para el selector (gestión diaria). */
export const ORDER_ESTADO_HINTS: Record<OrderEstado, string> = {
  por_pagar: "Falta el comprobante del cliente",
  pendiente: "En espera de verificar el pago",
  procesando: "Pago confirmado y armado",
  enviado: "En camino (guía opcional)",
  entregado: "Pedido completado",
  cancelado: "Pedido anulado",
};

export const ORDER_ESTADO_BADGE_CLASS: Record<OrderEstado, string> = {
  por_pagar:
    "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200",
  pendiente:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
  procesando:
    "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
  enviado:
    "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200",
  entregado:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  cancelado:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400",
};

export const ORDER_ESTADO_DOT_CLASS: Record<OrderEstado, string> = {
  por_pagar: "bg-orange-500",
  pendiente: "bg-amber-500",
  procesando: "bg-blue-500",
  enviado: "bg-violet-500",
  entregado: "bg-emerald-500",
  cancelado: "bg-zinc-400",
};

export type OrderFilterId = "all" | "today" | "dispatch" | "pending" | "completed";

export function isValidOrderEstado(value: string): value is OrderEstado {
  return (ORDER_ESTADOS as readonly string[]).includes(value);
}

/** Normaliza valores de BD (incl. legacy) al set simplificado. */
export function normalizeOrderEstado(value: unknown): OrderEstado {
  const raw = String(value ?? "pendiente").trim().toLowerCase();
  if (LEGACY_TO_PROCESANDO.has(raw)) return "procesando";
  if (isValidOrderEstado(raw)) return raw;
  return "pendiente";
}

/**
 * Pedido que aún espera el comprobante del cliente.
 * - `por_pagar`: estado explícito.
 * - `pendiente` + `payment_proof_url === null`: falta comprobante
 *   (incl. fallback si el check de BD aún no admite por_pagar).
 * - `payment_proof_url === ""`: método sin comprobante (efectivo, etc.).
 */
export function orderAwaitsPaymentProof(input: {
  estado: OrderEstado;
  payment_proof_url?: string | null;
}): boolean {
  if (input.payment_proof_url != null) return false;
  return input.estado === "por_pagar" || input.estado === "pendiente";
}

/**
 * Estado orientado al comprador: si falta comprobante, se muestra como
 * Pendiente de pago aunque en BD siga en pendiente (fallback).
 */
export function resolveCustomerOrderDisplayEstado(input: {
  estado: OrderEstado;
  payment_proof_url?: string | null;
}): OrderEstado {
  if (orderAwaitsPaymentProof(input)) return "por_pagar";
  return input.estado;
}

export function isDispatchPendingEstado(estado: OrderEstado): boolean {
  return (
    estado === "por_pagar" ||
    estado === "pendiente" ||
    estado === "procesando"
  );
}

export function isPendingOrderEstado(estado: OrderEstado): boolean {
  return estado !== "entregado" && estado !== "cancelado";
}

export function isCompletedOrderEstado(estado: OrderEstado): boolean {
  return estado === "entregado";
}

/** por_pagar / pendiente / procesando — prioridad en listados. */
export function isPriorityOrderEstado(estado: OrderEstado): boolean {
  return (
    estado === "por_pagar" ||
    estado === "pendiente" ||
    estado === "procesando"
  );
}

/** ORDER BY lógico: activos primero; resto por fecha desc. */
export function sortOrdersByBusinessRules<
  T extends { estado: OrderEstado; created_at: string },
>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const aPriority = isPriorityOrderEstado(a.estado);
    const bPriority = isPriorityOrderEstado(b.estado);

    if (aPriority !== bPriority) {
      return aPriority ? -1 : 1;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
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
