import { getCustomerCheckoutContext } from "@/lib/customers/get-customer-checkout-context";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";
import { createClient } from "@/lib/supabase/server";

export interface CartAuthContext {
  userId: string | null;
  storeId: string | null;
  isCustomer: boolean;
}

export async function getCartAuthContext(
  storeSlug: string,
): Promise<CartAuthContext> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const supabase = await createClient();
  const store = await resolveActiveStoreBySlug(supabase, normalizedSlug);

  if (!store) {
    return { userId: null, storeId: null, isCustomer: false };
  }

  const checkoutContext = await getCustomerCheckoutContext(normalizedSlug);

  return {
    userId: checkoutContext.userId,
    storeId: store.id,
    isCustomer: checkoutContext.isCustomer,
  };
}
