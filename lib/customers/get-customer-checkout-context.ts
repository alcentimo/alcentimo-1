import { createClient } from "@/lib/supabase/server";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";

export interface CustomerCheckoutContext {
  isAuthenticated: boolean;
  isCustomer: boolean;
  userId: string | null;
  displayName: string | null;
  phone: string | null;
}

async function getCustomerProfileForStore(
  supabase: SupabaseServerClient,
  userId: string,
  storeId: string,
) {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id, display_name, phone")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomerCheckoutContext(
  storeSlug: string,
): Promise<CustomerCheckoutContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: false,
      isCustomer: false,
      userId: null,
      displayName: null,
      phone: null,
    };
  }

  const store = await resolveActiveStoreBySlug(supabase, storeSlug);
  if (!store) {
    return {
      isAuthenticated: true,
      isCustomer: false,
      userId: user.id,
      displayName: null,
      phone: null,
    };
  }

  const profile = await getCustomerProfileForStore(supabase, user.id, store.id);
  if (!profile) {
    return {
      isAuthenticated: true,
      isCustomer: false,
      userId: user.id,
      displayName: null,
      phone: null,
    };
  }

  return {
    isAuthenticated: true,
    isCustomer: true,
    userId: user.id,
    displayName: profile.display_name,
    phone: profile.phone,
  };
}

/** Datos del cliente al crear pedido: perfil si existe; si no, invitado manual. */
export async function resolveOrderCustomerDetails(
  storeId: string,
  guestInput: { customerName: string; customerPhone: string },
): Promise<
  | {
      ok: true;
      customerUserId: string | null;
      customerName: string;
      customerPhone: string;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Awaited<ReturnType<typeof getCustomerProfileForStore>> = null;
  if (user) {
    profile = await getCustomerProfileForStore(supabase, user.id, storeId);
  }

  const profileName = profile?.display_name?.trim();
  const profilePhone = profile?.phone?.trim();

  if (
    profileName &&
    profileName.length >= 2 &&
    profilePhone &&
    profilePhone.length >= 10
  ) {
    return {
      ok: true,
      customerUserId: user!.id,
      customerName: profileName,
      customerPhone: profilePhone,
    };
  }

  const customerName = guestInput.customerName.trim();
  const customerPhone = guestInput.customerPhone.trim();

  if (!customerName || customerName.length < 2) {
    return { ok: false, error: "Indica tu nombre para el pedido." };
  }

  if (!customerPhone || customerPhone.length < 10) {
    return {
      ok: false,
      error: "Indica un teléfono válido (mínimo 10 dígitos).",
    };
  }

  return {
    ok: true,
    customerUserId: user && profile ? user.id : null,
    customerName,
    customerPhone,
  };
}
