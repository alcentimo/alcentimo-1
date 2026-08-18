export const ORDER_ESTADOS = [
  "por_pagar",
  "pendiente",
  "procesando",
  "preparacion_logistica",
  "enviado",
  "entregado",
  "cancelado",
] as const;

export type OrderEstado = (typeof ORDER_ESTADOS)[number];

/** Estados legacy que se normalizan a `procesando`. */
const LEGACY_TO_PROCESANDO = new Set(["verificando", "en_preparacion"]);

/**
 * Pipeline visible del dropshipper (más cancelado).
 * `por_pagar` se muestra como el mismo paso que `pendiente`.
 * `entregado` se muestra como `enviado`.
 */
export const DROPSHIPPER_STATUS_OPTIONS = [
  "pendiente",
  "procesando",
  "preparacion_logistica",
  "enviado",
  "cancelado",
] as const satisfies readonly OrderEstado[];

export type DropshipperStatusOption =
  (typeof DROPSHIPPER_STATUS_OPTIONS)[number];

export const ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  por_pagar: "Por verificar pago",
  pendiente: "Por verificar pago",
  procesando: "Pago aprobado / Procesando",
  preparacion_logistica: "En preparación logística",
  enviado: "Enviado",
  entregado: "Enviado",
  cancelado: "Cancelado",
};

/** Etiquetas orientadas al comprador final (catálogo / Mis compras). */
export const CUSTOMER_ORDER_ESTADO_LABELS: Record<OrderEstado, string> = {
  por_pagar: "Pago pendiente",
  pendiente: "Verificando tu pago",
  procesando: "Pago confirmado",
  preparacion_logistica: "Preparando tu envío",
  enviado: "Enviado",
  entregado: "Enviado",
  cancelado: "Cancelado",
};

export const CUSTOMER_ORDER_ESTADO_HINTS: Record<OrderEstado, string> = {
  por_pagar: "Sube el comprobante para verificar tu pago.",
  pendiente: "Estamos revisando tu pago.",
  procesando: "Pago confirmado. El centro de acopio ya tiene tu pedido.",
  preparacion_logistica: "El producto está listo. Alcéntimo prepara el envío.",
  enviado: "Tu pedido ya salió. Revisa el número de guía.",
  entregado: "Tu pedido ya salió. Revisa el número de guía.",
  cancelado: "Este pedido fue anulado.",
};

/** Pasos del seguimiento al cliente (4 estados del hub, sin cancelado). */
export const CUSTOMER_ORDER_STATUS_STEPS = [
  "pendiente",
  "procesando",
  "preparacion_logistica",
  "enviado",
] as const satisfies readonly OrderEstado[];

export type CustomerOrderStatusStep =
  (typeof CUSTOMER_ORDER_STATUS_STEPS)[number];

export function getCustomerOrderEstadoLabel(estado: OrderEstado): string {
  return CUSTOMER_ORDER_ESTADO_LABELS[estado];
}

/** Índice del paso actual en la línea de tiempo (cancelado → -1). */
export function getCustomerOrderStatusStepIndex(estado: OrderEstado): number {
  if (estado === "cancelado") return -1;
  const display = resolveCustomerPipelineEstado(estado);
  return CUSTOMER_ORDER_STATUS_STEPS.indexOf(display);
}

function resolveCustomerPipelineEstado(
  estado: OrderEstado,
): CustomerOrderStatusStep {
  if (estado === "por_pagar") return "pendiente";
  if (estado === "entregado") return "enviado";
  if (
    estado === "pendiente" ||
    estado === "procesando" ||
    estado === "preparacion_logistica" ||
    estado === "enviado"
  ) {
    return estado;
  }
  return "pendiente";
}

/** Texto corto para el selector del dropshipper. */
export const ORDER_ESTADO_HINTS: Record<OrderEstado, string> = {
  por_pagar: "Revisa el comprobante del cliente final",
  pendiente: "Revisa el comprobante del cliente final",
  procesando: "Pago aprobado. La orden pasó al centro de acopio",
  preparacion_logistica:
    "El proveedor apartó el stock. Alcéntimo recogerá el producto",
  enviado: "Alcéntimo despachó el paquete al cliente",
  entregado: "Alcéntimo despachó el paquete al cliente",
  cancelado: "Pedido anulado",
};

export const ORDER_ESTADO_BADGE_CLASS: Record<OrderEstado, string> = {
  por_pagar: "order-estado-pill--pendiente",
  pendiente: "order-estado-pill--pendiente",
  procesando: "order-estado-pill--procesando",
  preparacion_logistica: "order-estado-pill--preparacion_logistica",
  enviado: "order-estado-pill--enviado",
  entregado: "order-estado-pill--enviado",
  cancelado: "order-estado-pill--cancelado",
};

export const ORDER_ESTADO_DOT_CLASS: Record<OrderEstado, string> = {
  por_pagar: "order-estado-dot--pendiente",
  pendiente: "order-estado-dot--pendiente",
  procesando: "order-estado-dot--procesando",
  preparacion_logistica: "order-estado-dot--preparacion_logistica",
  enviado: "order-estado-dot--enviado",
  entregado: "order-estado-dot--enviado",
  cancelado: "order-estado-dot--cancelado",
};

export type OrderFilterId =
  | "all"
  | "today"
  | "verify"
  | "processing"
  | "logistics"
  | "shipped"
  | "dispatch"
  | "pending"
  | "completed";

export function isValidOrderEstado(value: string): value is OrderEstado {
  return (ORDER_ESTADOS as readonly string[]).includes(value);
}

export function isDropshipperStatusOption(
  value: string,
): value is DropshipperStatusOption {
  return (DROPSHIPPER_STATUS_OPTIONS as readonly string[]).includes(value);
}

/** Normaliza valores de BD (incl. legacy) al set actual. */
export function normalizeOrderEstado(value: unknown): OrderEstado {
  const raw = String(value ?? "pendiente").trim().toLowerCase();
  if (LEGACY_TO_PROCESANDO.has(raw)) return "procesando";
  if (isValidOrderEstado(raw)) return raw;
  return "pendiente";
}

/**
 * Estado que el dropshipper ve y elige en el selector.
 * Agrupa por_pagar→pendiente y entregado→enviado.
 */
export function resolveDropshipperDisplayEstado(
  estado: OrderEstado,
): DropshipperStatusOption | "cancelado" {
  if (estado === "cancelado") return "cancelado";
  if (estado === "por_pagar") return "pendiente";
  if (estado === "entregado") return "enviado";
  if (isDropshipperStatusOption(estado)) return estado;
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
 * pago pendiente aunque en BD siga en pendiente (fallback).
 */
export function resolveCustomerOrderDisplayEstado(input: {
  estado: OrderEstado;
  payment_proof_url?: string | null;
}): OrderEstado {
  if (orderAwaitsPaymentProof(input)) return "por_pagar";
  return input.estado;
}

export function isVerifyPaymentEstado(estado: OrderEstado): boolean {
  return estado === "por_pagar" || estado === "pendiente";
}

export function isDispatchPendingEstado(estado: OrderEstado): boolean {
  return (
    estado === "por_pagar" ||
    estado === "pendiente" ||
    estado === "procesando" ||
    estado === "preparacion_logistica"
  );
}

/** Estados que requieren atención del comercio (badge / alertas). */
export const PRIORITY_ORDER_ESTADOS = [
  "por_pagar",
  "pendiente",
] as const satisfies readonly OrderEstado[];

export function isPendingOrderEstado(estado: OrderEstado): boolean {
  return estado !== "enviado" && estado !== "entregado" && estado !== "cancelado";
}

export function isCompletedOrderEstado(estado: OrderEstado): boolean {
  return estado === "enviado" || estado === "entregado";
}

/** por_pagar / pendiente — el dropshipper debe revisar el pago. */
export function isPriorityOrderEstado(estado: OrderEstado): boolean {
  return estado === "por_pagar" || estado === "pendiente";
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
  if (filter === "verify") return isVerifyPaymentEstado(estado);
  if (filter === "processing") return estado === "procesando";
  if (filter === "logistics") return estado === "preparacion_logistica";
  if (filter === "shipped" || filter === "completed") {
    return isCompletedOrderEstado(estado);
  }
  if (filter === "dispatch") return isDispatchPendingEstado(estado);
  if (filter === "pending") return isPendingOrderEstado(estado);
  return false;
}
