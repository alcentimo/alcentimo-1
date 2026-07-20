"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { uploadSubscriptionPaymentProof } from "@/lib/plans/manual-payment-storage";
import { isReferencePermanentlyRejected } from "@/lib/plans/get-user-payment-review";

export type ResubmitPaymentResult = {
  error?: string;
  success?: boolean;
};

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

/**
 * Usuario corrige un pago en estado needs_correction:
 * actualiza comprobante/referencia y vuelve a pending.
 */
export async function resubmitCorrectedManualPayment(
  formData: FormData,
): Promise<ResubmitPaymentResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const referenceNumber = normalizeReference(
    String(formData.get("referenceNumber") ?? ""),
  );
  const proofFile = formData.get("proofImage");

  if (!paymentId) {
    return { error: "Pago no válido." };
  }

  if (referenceNumber.length < 4) {
    return { error: "Ingresa un número de referencia válido." };
  }

  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { error: "Sube la captura corregida de tu pago." };
  }

  if (await isReferencePermanentlyRejected(auth.authUser.id, referenceNumber)) {
    return {
      error:
        "Esta referencia fue rechazada permanentemente. Usa otra referencia o contacta soporte.",
    };
  }

  const admin = createAdminClient();

  const { data: payment, error: loadError } = await admin
    .from("manual_payments")
    .select("id, user_id, status, reference_number")
    .eq("id", paymentId)
    .eq("user_id", auth.authUser.id)
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!payment) return { error: "Pago no encontrado." };
  if (payment.status !== "needs_correction") {
    return {
      error: "Este pago no está pendiente de corrección.",
    };
  }

  const upload = await uploadSubscriptionPaymentProof(
    auth.authUser.id,
    proofFile,
  );
  if (!upload.url) {
    return { error: upload.error ?? "No se pudo subir el comprobante." };
  }

  const { error: updateError } = await admin
    .from("manual_payments")
    .update({
      status: "pending",
      reference_number: referenceNumber,
      image_url: upload.url,
      admin_note: null,
      correction_requested_at: null,
      permanently_rejected: false,
      rejected_at: null,
    })
    .eq("id", paymentId)
    .eq("user_id", auth.authUser.id)
    .eq("status", "needs_correction");

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard/pago");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/upgrade");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard", "layout");

  return { success: true };
}
