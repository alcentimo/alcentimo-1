/** Datos de Pago Móvil de alcentimo para cobro de suscripciones. */
export interface SubscriptionPagoMovilDetails {
  bank: string;
  phone: string;
  ci: string;
  holderName: string;
}

/** Fallback sync (env / defaults). Preferir fetchSubscriptionPagoMovilDetails en servidor. */
export function getSubscriptionPagoMovilDetails(): SubscriptionPagoMovilDetails {
  return {
    bank: process.env.NEXT_PUBLIC_ALCENTIMO_PM_BANK?.trim() || "Mercantil",
    phone:
      process.env.NEXT_PUBLIC_ALCENTIMO_PM_PHONE?.trim() || "04129839915",
    ci: process.env.NEXT_PUBLIC_ALCENTIMO_PM_CI?.trim() || "25074267",
    holderName:
      process.env.NEXT_PUBLIC_ALCENTIMO_PM_HOLDER?.trim() || "",
  };
}
