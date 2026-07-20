"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { SUBSCRIPTION_PAGO_MOVIL_KEY } from "@/lib/plans/get-subscription-pago-movil";
import type { SubscriptionPagoMovilDetails } from "@/src/config/subscription-pago-movil";

export type UpdatePaymentMethodsResult = {
  error?: string;
  success?: boolean;
  details?: SubscriptionPagoMovilDetails;
};

function normalizeField(value: unknown, label: string): string | { error: string } {
  if (typeof value !== "string") {
    return { error: `${label} es obligatorio.` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: `${label} es obligatorio.` };
  }
  if (trimmed.length > 120) {
    return { error: `${label} es demasiado largo.` };
  }
  return trimmed;
}

export async function updateSubscriptionPagoMovil(
  formData: FormData,
): Promise<UpdatePaymentMethodsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso para editar la configuración de pago." };
  }

  const bank = normalizeField(formData.get("bank"), "Banco");
  if (typeof bank === "object") return bank;

  const phone = normalizeField(formData.get("phone"), "Teléfono");
  if (typeof phone === "object") return phone;

  const ci = normalizeField(formData.get("ci"), "Cédula/RIF");
  if (typeof ci === "object") return ci;

  const holderRaw = formData.get("holderName");
  const holderName =
    typeof holderRaw === "string" ? holderRaw.trim().slice(0, 120) : "";

  const admin = createAdminClient();
  const { error } = await admin.from("payment_methods").upsert(
    {
      method_key: SUBSCRIPTION_PAGO_MOVIL_KEY,
      bank,
      phone,
      ci,
      holder_name: holderName,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "method_key" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/upgrade");
  revalidatePath("/dashboard/pago");

  return {
    success: true,
    details: { bank, phone, ci, holderName },
  };
}
