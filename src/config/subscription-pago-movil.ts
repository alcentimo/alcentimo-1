/** Método de cobro de suscripción (plataforma). */
export interface SubscriptionPaymentMethod {
  id: string;
  name: string;
  bank: string;
  /** Teléfono o correo de contacto. */
  phone: string;
  ci: string;
  holderName: string;
  qrImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Forma legacy de un solo Pago Móvil.
 * Preferir `SubscriptionPaymentMethod` / listas activas.
 */
export interface SubscriptionPagoMovilDetails {
  bank: string;
  phone: string;
  ci: string;
  holderName: string;
}

/** Fallback sync (env / defaults) cuando la BD no tiene métodos. */
export function getDefaultSubscriptionPaymentMethods(): SubscriptionPaymentMethod[] {
  const bank =
    process.env.NEXT_PUBLIC_ALCENTIMO_PM_BANK?.trim() || "Mercantil";
  const phone =
    process.env.NEXT_PUBLIC_ALCENTIMO_PM_PHONE?.trim() || "04129839915";
  const ci =
    process.env.NEXT_PUBLIC_ALCENTIMO_PM_CI?.trim() || "25074267";
  const holderName =
    process.env.NEXT_PUBLIC_ALCENTIMO_PM_HOLDER?.trim() || "";

  return [
    {
      id: "subscription_pago_movil",
      name: bank ? `Pago Móvil ${bank}` : "Pago Móvil",
      bank,
      phone,
      ci,
      holderName,
      qrImageUrl: null,
      isActive: true,
      sortOrder: 0,
    },
  ];
}

/** @deprecated Preferir getDefaultSubscriptionPaymentMethods / fetch activos. */
export function getSubscriptionPagoMovilDetails(): SubscriptionPagoMovilDetails {
  const [first] = getDefaultSubscriptionPaymentMethods();
  return {
    bank: first.bank,
    phone: first.phone,
    ci: first.ci,
    holderName: first.holderName,
  };
}

export function toLegacyPagoMovilDetails(
  method: SubscriptionPaymentMethod | null | undefined,
): SubscriptionPagoMovilDetails {
  if (!method) return getSubscriptionPagoMovilDetails();
  return {
    bank: method.bank,
    phone: method.phone,
    ci: method.ci,
    holderName: method.holderName,
  };
}
