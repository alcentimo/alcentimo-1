"use server";

import { getCustomerCheckoutContext } from "@/lib/customers/get-customer-checkout-context";

/** Contexto opcional del cliente logueado (sin bloquear invitados). */
export async function loadCustomerCheckoutContext(storeSlug: string) {
  return getCustomerCheckoutContext(storeSlug);
}
