import { createAdminClient } from "@/lib/supabase/admin";
import type { ManualPayment, ManualPaymentStatus } from "@/lib/database.types";

const REVIEW_STATUSES: ManualPaymentStatus[] = ["pending", "needs_correction"];

export interface UserPaymentReview {
  payment: ManualPayment;
  isPending: boolean;
  needsCorrection: boolean;
}

/** Pago activo en revisión o pendiente de corrección del usuario. */
export async function getUserPaymentReview(
  userId: string,
): Promise<UserPaymentReview | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at, billing_period, from_plan, from_billing_period, list_price_usd, credit_usd, amount_due_usd, days_remaining, credited_period_ends_at, admin_note, permanently_rejected, correction_requested_at",
    )
    .eq("user_id", userId)
    .in("status", REVIEW_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const payment = data as ManualPayment;
  return {
    payment,
    isPending: payment.status === "pending",
    needsCorrection: payment.status === "needs_correction",
  };
}

export async function isReferencePermanentlyRejected(
  userId: string,
  referenceNumber: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const normalized = referenceNumber.trim().replace(/\s+/g, "");

  const { data, error } = await admin
    .from("manual_payments")
    .select("id")
    .eq("user_id", userId)
    .eq("reference_number", normalized)
    .eq("status", "rejected")
    .eq("permanently_rejected", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

/** Último rechazo permanente (para notificar al usuario en el dashboard). */
export async function getLatestPermanentRejection(
  userId: string,
): Promise<ManualPayment | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at, billing_period, from_plan, from_billing_period, list_price_usd, credit_usd, amount_due_usd, days_remaining, credited_period_ends_at, admin_note, permanently_rejected, correction_requested_at",
    )
    .eq("user_id", userId)
    .eq("status", "rejected")
    .eq("permanently_rejected", true)
    .order("rejected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ManualPayment | null) ?? null;
}
