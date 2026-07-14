"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import type { PaymentReportPlanId } from "@/lib/database.types";
import {
  getDisplayedMonthlyPrice,
  PLAN_PRICING_TIERS,
  type BillingPeriod,
} from "@/src/config/plan-pricing-ui";
import { isVenezuelaBank } from "@/src/config/venezuela-banks";
import type { PlanId } from "@/src/config/plans";

export type PaymentReportActionResult = {
  error?: string;
  success?: boolean;
};

const UPGRADE_PLAN_IDS = new Set<PlanId>(["starter", "premium"]);

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export async function submitPaymentReport(input: {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  referenceNumber: string;
  originBank: string;
}): Promise<PaymentReportActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { planId, billingPeriod, referenceNumber, originBank } = input;

  if (!UPGRADE_PLAN_IDS.has(planId)) {
    return { error: "Plan no válido para suscripción." };
  }

  if (billingPeriod !== "monthly" && billingPeriod !== "annual") {
    return { error: "Periodo de facturación no válido." };
  }

  const reference = normalizeReference(referenceNumber);
  if (reference.length < 4) {
    return { error: "Ingresa un número de referencia válido." };
  }

  const bank = originBank.trim();
  if (!bank || !isVenezuelaBank(bank)) {
    return { error: "Selecciona el banco de origen." };
  }

  const tier = PLAN_PRICING_TIERS.find((item) => item.planId === planId);
  if (!tier || tier.monthlyUsd <= 0) {
    return { error: "No se pudo calcular el monto del plan." };
  }

  const amountUsd = getDisplayedMonthlyPrice(tier.monthlyUsd, billingPeriod);

  const { error } = await supabase.from("payment_reports").insert({
    user_id: auth.authUser.id,
    plan_id: planId as PaymentReportPlanId,
    billing_period: billingPeriod,
    amount_usd: amountUsd,
    reference_number: reference,
    origin_bank: bank,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
