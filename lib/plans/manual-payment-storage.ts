import { createAdminClient } from "@/lib/supabase/admin";
import {
  compressProductImage,
  type ImageOptimizationResult,
} from "@/lib/image-compress";

export const SUBSCRIPTION_PAYMENT_PROOFS_BUCKET = "subscription-payment-proofs";

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadSubscriptionPaymentProof(
  userId: string,
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
    optimization = await compressProductImage(inputBuffer);
  } catch {
    return { error: "No se pudo procesar la imagen del comprobante." };
  }

  const admin = createAdminClient();
  const path = `${userId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await admin.storage
    .from(SUBSCRIPTION_PAYMENT_PROOFS_BUCKET)
    .upload(path, optimization.buffer, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = admin.storage
    .from(SUBSCRIPTION_PAYMENT_PROOFS_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl };
}
