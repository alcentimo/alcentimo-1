"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import type { ManualPayment } from "@/lib/database.types";
import {
  buildPaidProfilePatch,
  buildRevokedProfilePatch,
  manualPaymentPlanToDbPlan,
} from "@/lib/plans/plan-activation";

export type ManualPaymentAdminActionResult = {
  error?: string;
  success?: boolean;
};

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso para gestionar pagos." };
  }

  return { ok: true as const };
}

async function getPendingPayment(
  paymentId: string,
): Promise<{ payment?: ManualPayment; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Pago no encontrado." };

  return { payment: data as ManualPayment };
}

function revalidatePlanPaths() {
  revalidatePath("/admin/pagos");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/catalogo");
}

/**
 * Confirma un pago pendiente: marca el comprobante como verified y activa
 * el plan pagado (PRO / BUSINESS) en profiles del dueño (owner_id).
 */
export async function verifyManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const { payment, error: loadError } = await getPendingPayment(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending") {
    return { error: "Este pago ya fue procesado." };
  }

  const admin = createAdminClient();
  const planDb = manualPaymentPlanToDbPlan(payment.plan_id);
  const now = new Date().toISOString();

  // El pagador es el dueño de la(s) tienda(s); activamos su perfil.
  const ownerId = payment.user_id;

  const { data: ownedStores, error: storesError } = await admin
    .from("stores")
    .select("id")
    .eq("owner_id", ownerId)
    .limit(1);

  if (storesError) return { error: storesError.message };
  if (!ownedStores?.length) {
    return {
      error:
        "No se encontró una tienda con este owner_id. No se puede activar el plan.",
    };
  }

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({ status: "verified", verified_at: now })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (paymentError) return { error: paymentError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update(buildPaidProfilePatch(planDb, "active"))
    .eq("id", ownerId);

  if (profileError) return { error: profileError.message };

  revalidatePlanPaths();
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/** Rechaza un pago y revoca el acceso Pro provisional si aplica. */
export async function rejectManualPayment(
  paymentId: string,
): Promise<ManualPaymentAdminActionResult> {
  const gate = await requireSupportAdmin();
  if (!gate.ok) return { error: gate.error };

  const { payment, error: loadError } = await getPendingPayment(paymentId);
  if (loadError || !payment) return { error: loadError ?? "Pago no encontrado." };

  if (payment.status !== "pending") {
    return { error: "Este pago ya fue procesado." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: paymentError } = await admin
    .from("manual_payments")
    .update({ status: "rejected", rejected_at: now })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (paymentError) return { error: paymentError.message };

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", payment.user_id)
    .maybeSingle();

  if (profile?.subscription_status === "provisional") {
    const { error: profileError } = await admin
      .from("profiles")
      .update(buildRevokedProfilePatch())
      .eq("id", payment.user_id);

    if (profileError) return { error: profileError.message };
  }

  revalidatePlanPaths();
  return { success: true };
}
