import { createClient } from "@/lib/supabase/server";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { resolveActiveStoreBySlug } from "@/lib/customers/middleware-access";
import {
  isValidCustomerPhone,
  normalizeCustomerPhone,
  resolveCustomerContactEmail,
  resolveCustomerDisplayNameFromAuth,
  resolveCustomerPhoneFromAuth,
  validateCustomerPhoneInput,
} from "@/lib/customers/phone-auth";

export interface CustomerCheckoutContext {
  isAuthenticated: boolean;
  isCustomer: boolean;
  userId: string | null;
  displayName: string | null;
  phone: string | null;
  contactEmail: string | null;
  deliveryAddress: string | null;
  preferredShippingMethod: string | null;
  preferredShippingBranchCode: string | null;
  preferredShippingBranchName: string | null;
  preferredShippingBranchAddress: string | null;
}

function emptyGuestContext(): CustomerCheckoutContext {
  return {
    isAuthenticated: false,
    isCustomer: false,
    userId: null,
    displayName: null,
    phone: null,
    contactEmail: null,
    deliveryAddress: null,
    preferredShippingMethod: null,
    preferredShippingBranchCode: null,
    preferredShippingBranchName: null,
    preferredShippingBranchAddress: null,
  };
}

function normalizeProfilePhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  if (!trimmed) return null;
  const normalized = normalizeCustomerPhone(trimmed);
  return isValidCustomerPhone(normalized) ? normalized.slice(0, 40) : trimmed.slice(0, 40);
}

async function getCustomerProfileForStore(
  supabase: SupabaseServerClient,
  userId: string,
  storeId: string,
) {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select(
      "id, display_name, phone, delivery_address, preferred_shipping_method, preferred_shipping_branch_code, preferred_shipping_branch_name, preferred_shipping_branch_address",
    )
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
    return emptyGuestContext();
  }

  const contactEmail = resolveCustomerContactEmail(user.email, user.user_metadata);
  const authDisplayName = resolveCustomerDisplayNameFromAuth(user);
  const authPhone = resolveCustomerPhoneFromAuth(user);

  const store = await resolveActiveStoreBySlug(supabase, storeSlug);
  if (!store) {
    return {
      isAuthenticated: true,
      isCustomer: false,
      userId: user.id,
      displayName: authDisplayName,
      phone: authPhone,
      contactEmail,
      deliveryAddress: null,
      preferredShippingMethod: null,
      preferredShippingBranchCode: null,
      preferredShippingBranchName: null,
      preferredShippingBranchAddress: null,
    };
  }

  const profile = await getCustomerProfileForStore(supabase, user.id, store.id);
  if (!profile) {
    return {
      isAuthenticated: true,
      isCustomer: false,
      userId: user.id,
      displayName: authDisplayName,
      phone: authPhone,
      contactEmail,
      deliveryAddress: null,
      preferredShippingMethod: null,
      preferredShippingBranchCode: null,
      preferredShippingBranchName: null,
      preferredShippingBranchAddress: null,
    };
  }

  const profileName = profile.display_name?.trim() || null;
  const profilePhone = normalizeProfilePhone(profile.phone);

  return {
    isAuthenticated: true,
    isCustomer: true,
    userId: user.id,
    displayName:
      profileName && profileName.length >= 2 ? profileName : authDisplayName,
    phone: profilePhone ?? authPhone,
    contactEmail,
    deliveryAddress: (profile.delivery_address as string | null) ?? null,
    preferredShippingMethod:
      (profile.preferred_shipping_method as string | null) ?? null,
    preferredShippingBranchCode:
      (profile.preferred_shipping_branch_code as string | null) ?? null,
    preferredShippingBranchName:
      (profile.preferred_shipping_branch_name as string | null) ?? null,
    preferredShippingBranchAddress:
      (profile.preferred_shipping_branch_address as string | null) ?? null,
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

  const profileName =
    profile?.display_name?.trim() ||
    (user ? resolveCustomerDisplayNameFromAuth(user) : null);
  const profilePhoneRaw =
    profile?.phone?.trim() ||
    (user ? resolveCustomerPhoneFromAuth(user) : null);
  const profilePhone = profilePhoneRaw
    ? normalizeProfilePhone(profilePhoneRaw)
    : null;

  const formName = guestInput.customerName.trim();
  const formPhoneValidation = guestInput.customerPhone.trim()
    ? validateCustomerPhoneInput(guestInput.customerPhone)
    : null;

  // Preferir lo que el cliente escribió en Datos (p. ej. teléfono nuevo).
  const customerName =
    formName.length >= 2
      ? formName
      : profileName && profileName.length >= 2
        ? profileName
        : "";
  const customerPhone =
    formPhoneValidation && formPhoneValidation.ok
      ? formPhoneValidation.phone
      : profilePhone && isValidCustomerPhone(profilePhone)
        ? profilePhone
        : null;

  if (!customerName || customerName.length < 2) {
    return { ok: false, error: "Indica tu nombre para el pedido." };
  }

  if (!customerPhone) {
    return {
      ok: false,
      error:
        formPhoneValidation && !formPhoneValidation.ok
          ? formPhoneValidation.error
          : "Indica un teléfono válido (mínimo 10 dígitos).",
    };
  }

  return {
    ok: true,
    // Usuario logueado siempre queda vinculado, aunque el perfil no tuviera teléfono.
    customerUserId: user?.id ?? null,
    customerName,
    customerPhone,
  };
}
