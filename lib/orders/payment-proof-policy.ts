/** Política de comprobantes de pago de pedidos (Supabase Storage). */

export const ORDER_PAYMENT_PROOF_RETENTION_DAYS = 60;

export const ORDER_PAYMENT_PROOF_RETENTION_NOTICE =
  "Los comprobantes de pago se conservan en la plataforma por 60 días para validación operativa.";

/** Ancho/lado largo máximo (mantiene proporción). */
export const PAYMENT_PROOF_MAX_DIMENSION = 1080;

/** Peso máximo objetivo tras optimizar. */
export const PAYMENT_PROOF_MAX_OUTPUT_BYTES = 200 * 1024;

/** Calidad WebP inicial (~78%). */
export const PAYMENT_PROOF_WEBP_QUALITY = 0.78;

/** Calidad mínima al reducir para caber en el peso objetivo. */
export const PAYMENT_PROOF_MIN_WEBP_QUALITY = 0.75;
