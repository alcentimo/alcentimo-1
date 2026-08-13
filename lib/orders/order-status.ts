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
  por_pagar: "order-estado-pill--por_pagar",
  pendiente: "order-estado-pill--pendiente",
  procesando: "order-estado-pill--procesando",
  enviado: "order-estado-pill--enviado",
  entregado: "order-estado-pill--entregado",
  cancelado: "order-estado-pill--cancelado",
};

export const ORDER_ESTADO_DOT_CLASS: Record<OrderEstado, string> = {
  por_pagar: "order-estado-dot--por_pagar",
  pendiente: "order-estado-dot--pendiente",
  procesando: "order-estado-dot--procesando",
  enviado: "order-estado-dot--enviado",
  entregado: "order-estado-dot--entregado",
  cancelado: "order-estado-dot--cancelado",
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

/** Estados que requieren atención del comercio (badge / alertas). */
export const PRIORITY_ORDER_ESTADOS = [
  "por_pagar",
  "pendiente",
  "procesando",
] as const satisfies readonly OrderEstado[];

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
