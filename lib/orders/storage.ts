import { createAdminClient } from "@/lib/supabase/admin";
import {
  compressPaymentProofImage,
  type ImageOptimizationResult,
} from "@/lib/image-compress";

export const ORDER_PAYMENT_PROOFS_BUCKET = "order-payment-proofs";

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function buildOrderPaymentProofPath(
  storeId: string,
  orderId: string,
): string {
  return `${storeId}/${orderId}.webp`;
}

/** Extrae el path del bucket desde una URL pública de Supabase Storage. */
export function extractOrderPaymentProofPathFromUrl(
  url: string,
): string | null {
  const marker = `/storage/v1/object/public/${ORDER_PAYMENT_PROOFS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split("?")[0]?.trim();
  return path || null;
}

export async function uploadOrderPaymentProof(
  storeId: string,
  orderId: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  if (file.size > MAX_PROOF_SIZE) {
    return { error: "El comprobante supera el límite de 5 MB." };
  }

  let optimization: ImageOptimizationResult;
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    optimization = await compressPaymentProofImage(inputBuffer);
  } catch {
    return { error: "No se pudo procesar la imagen del comprobante." };
  }

  const admin = createAdminClient();
  const path = buildOrderPaymentProofPath(storeId, orderId);

  const { error: uploadError } = await admin.storage
    .from(ORDER_PAYMENT_PROOFS_BUCKET)
    .upload(path, optimization.buffer, {
      cacheControl: "31536000",
      upsert: true,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = admin.storage
    .from(ORDER_PAYMENT_PROOFS_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl };
}

/** Borra el archivo físico del comprobante. No altera otros campos del pedido. */
export async function deleteOrderPaymentProofFile(
  storeId: string,
  orderId: string,
  paymentProofUrl?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const pathFromUrl = paymentProofUrl
    ? extractOrderPaymentProofPathFromUrl(paymentProofUrl)
    : null;
  const path = pathFromUrl ?? buildOrderPaymentProofPath(storeId, orderId);

  const { error } = await admin.storage
    .from(ORDER_PAYMENT_PROOFS_BUCKET)
    .remove([path]);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
