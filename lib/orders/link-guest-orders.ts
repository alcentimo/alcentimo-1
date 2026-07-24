"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneDigits } from "@/lib/customers/phone-auth";
import { getStoreBySlug } from "@/lib/stores";

function phonesMatch(a: string, b: string): boolean {
  const digitsA = normalizePhoneDigits(a);
  const digitsB = normalizePhoneDigits(b);
  if (digitsA.length < 10 || digitsB.length < 10) return false;
  if (digitsA === digitsB) return true;
  return digitsA.slice(-10) === digitsB.slice(-10);
}

/** Vincula pedidos de invitado al perfil del cliente (mismo teléfono en la tienda). */
export async function linkGuestOrdersToCustomer(input: {
  storeSlug: string;
  userId: string;
  phone: string;
  orderId?: string | null;
}): Promise<{ linkedCount: number }> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { linkedCount: 0 };

  const admin = createAdminClient();
  const idsToLink = new Set<string>();

  if (input.orderId?.trim()) {
    idsToLink.add(input.orderId.trim());
  }

  const { data: guestOrders } = await admin
    .from("orders")
    .select("id, customer_phone")
    .eq("store_id", store.id)
    .is("customer_user_id", null);

  for (const order of guestOrders ?? []) {
    if (phonesMatch(input.phone, order.customer_phone ?? "")) {
      idsToLink.add(order.id as string);
    }
  }

  if (idsToLink.size === 0) return { linkedCount: 0 };

  const { data: updated } = await admin
    .from("orders")
    .update({ customer_user_id: input.userId })
    .eq("store_id", store.id)
    .is("customer_user_id", null)
    .in("id", [...idsToLink])
    .select("id");

  return { linkedCount: updated?.length ?? 0 };
}
