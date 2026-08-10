import type { CustomerMessageGoal } from "@/lib/ai/customer-message-types";
import {
  isInactiveCustomer,
  isVipCustomer,
  suggestCustomerMessageGoal,
} from "@/lib/customers/customer-segments";
import type { StoreCustomerSummary } from "@/lib/customers/store-customer-stats";

function firstName(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return "cliente";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Plantilla de reenganche para clientes inactivos o sin compras. */
export function buildReactivationWhatsAppMessage(
  customer: StoreCustomerSummary,
  storeName: string,
): string {
  const name = firstName(customer.displayName);
  if (customer.orderCount === 0) {
    return `Hola ${name}, soy de ${storeName}. Vi que ya tienes cuenta con nosotros y quería invitarte a dar un vistazo al catálogo. Si te interesa algo, con gusto te ayudo.`;
  }
  return `Hola ${name}, te escribimos desde ${storeName}. Hace un tiempo no te vemos por aquí y queríamos saber cómo estás. Cuando quieras, el catálogo está listo para ti. ¡Te esperamos!`;
}

/** Plantilla de agradecimiento / VIP / promoción exclusiva. */
export function buildVipWhatsAppMessage(
  customer: StoreCustomerSummary,
  storeName: string,
): string {
  const name = firstName(customer.displayName);
  if (isVipCustomer(customer)) {
    return `Hola ${name}, gracias por confiar en ${storeName}. Eres de nuestros clientes más especiales y queríamos saludarte con una atención preferente. Si necesitas algo, escríbenos por aquí.`;
  }
  return `Hola ${name}, gracias por confiar en ${storeName}. Queríamos saludarte y recordarte que estamos para lo que necesites. Un gusto atenderte.`;
}

export function buildCustomerWhatsAppTemplate(
  customer: StoreCustomerSummary,
  storeName: string,
  goal?: CustomerMessageGoal,
): string {
  const resolved = goal ?? suggestCustomerMessageGoal(customer);
  if (resolved === "reactivacion") {
    return buildReactivationWhatsAppMessage(customer, storeName);
  }
  return buildVipWhatsAppMessage(customer, storeName);
}

export function getCustomerWhatsAppActionLabel(
  customer: StoreCustomerSummary,
): string {
  if (isInactiveCustomer(customer) || customer.orderCount === 0) {
    return "Reactivar";
  }
  if (isVipCustomer(customer)) {
    return "VIP";
  }
  return "WhatsApp";
}
