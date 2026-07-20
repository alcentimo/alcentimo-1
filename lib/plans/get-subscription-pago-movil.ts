import { createClient } from "@/lib/supabase/server";
import {
  getSubscriptionPagoMovilDetails,
  type SubscriptionPagoMovilDetails,
} from "@/src/config/subscription-pago-movil";

export const SUBSCRIPTION_PAGO_MOVIL_KEY = "subscription_pago_movil" as const;

/**
 * Lee los datos de Pago Móvil desde public.payment_methods.
 * Si la tabla aún no existe o falla la lectura, usa env/defaults.
 */
export async function fetchSubscriptionPagoMovilDetails(): Promise<SubscriptionPagoMovilDetails> {
  const defaults = getSubscriptionPagoMovilDetails();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_methods")
      .select("bank, phone, ci, holder_name")
      .eq("method_key", SUBSCRIPTION_PAGO_MOVIL_KEY)
      .maybeSingle();

    if (error || !data) return defaults;

    return {
      bank: data.bank?.trim() || defaults.bank,
      phone: data.phone?.trim() || defaults.phone,
      ci: data.ci?.trim() || defaults.ci,
      holderName: data.holder_name?.trim() || defaults.holderName,
    };
  } catch {
    return defaults;
  }
}
