/** Datos de Pago Móvil de alcentimo para cobro de suscripciones. */
export interface SubscriptionPagoMovilDetails {
  phone: string;
  ci: string;
  bank: string;
}

export function getSubscriptionPagoMovilDetails(): SubscriptionPagoMovilDetails {
  return {
    phone:
      process.env.NEXT_PUBLIC_ALCENTIMO_PM_PHONE?.trim() || "04129839915",
    ci: process.env.NEXT_PUBLIC_ALCENTIMO_PM_CI?.trim() || "25074267",
    bank: process.env.NEXT_PUBLIC_ALCENTIMO_PM_BANK?.trim() || "Mercantil",
  };
}
