"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerProfile } from "@/lib/customers/ensure-customer-profile";
import {
  CUSTOMER_MIN_PASSWORD_LENGTH,
  CUSTOMER_PASSWORD_SET_META_KEY,
  customerCanManagePassword,
  isSyntheticCustomerAuthEmail,
  validateCustomerEmailInput,
  validateCustomerPasswordPair,
  validateCustomerPhoneInput,
} from "@/lib/customers/phone-auth";
import { getStoreCustomerAccountPath } from "@/lib/store-host";

export type CustomerProfileActionError = { ok: false; error: string };

export type SaveCustomerProfileResult =
  | {
      ok: true;
      displayName: string;
      phone: string | null;
      contactEmail: string | null;
      deliveryAddress: string | null;
    }
  | CustomerProfileActionError;

export type ChangeCustomerPasswordResult =
  | { ok: true }
  | CustomerProfileActionError;

export async function saveCustomerProfile(input: {
  storeSlug: string;
  displayName: string;
  phone: string;
  contactEmail?: string | null;
  deliveryAddress?: string | null;
  requirePhone?: boolean;
}): Promise<SaveCustomerProfileResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const deliveryAddress = input.deliveryAddress?.trim() ?? "";
  const requirePhone = input.requirePhone !== false;

  if (displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  let phone: string | null = null;
  if (input.phone.trim() || requirePhone) {
    const phoneValidation = validateCustomerPhoneInput(input.phone);
    if (!phoneValidation.ok) {
      return { ok: false, error: phoneValidation.error };
    }
    phone = phoneValidation.phone;
  }

  let contactEmail: string | null = null;
  const rawContactEmail = input.contactEmail?.trim() ?? "";
  if (rawContactEmail) {
    const emailValidation = validateCustomerEmailInput(rawContactEmail);
    if (!emailValidation.ok) {
      return { ok: false, error: emailValidation.error };
    }
    contactEmail = emailValidation.email;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión para guardar tu perfil." };
  }

  const result = await ensureCustomerProfile(supabase, user, storeSlug, {
    displayName,
    phone,
    requireDisplayName: true,
    requirePhone,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const nextDeliveryAddress =
    deliveryAddress.length > 0 ? deliveryAddress.slice(0, 500) : null;

  const { error: addressError } = await supabase
    .from("customer_profiles")
    .update({
      delivery_address: nextDeliveryAddress,
      // Forzar los valores editados (sin fallback a metadata antigua).
      display_name: displayName.slice(0, 120),
      phone: phone ? phone.slice(0, 40) : null,
    })
    .eq("user_id", user.id)
    .eq("store_id", result.storeId);

  if (addressError) {
    return { ok: false, error: addressError.message };
  }

  // Mantener metadata Auth alineada para checkout / autofill.
  const admin = createAdminClient();
  const nextMetadata: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    display_name: displayName.slice(0, 120),
  };

  if (phone) {
    nextMetadata.phone = phone;
  } else {
    delete nextMetadata.phone;
  }

  if (isSyntheticCustomerAuthEmail(user.email)) {
    if (contactEmail) {
      nextMetadata.contact_email = contactEmail;
    } else if (input.contactEmail !== undefined) {
      delete nextMetadata.contact_email;
    }
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });

  if (metaError) {
    return { ok: false, error: metaError.message };
  }

  revalidatePath(getStoreCustomerAccountPath(storeSlug, "perfil"));
  revalidatePath(`/c/${storeSlug}/perfil`);
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(getStoreCustomerAccountPath(storeSlug, "cuenta"));

  return {
    ok: true,
    displayName: displayName.slice(0, 120),
    phone,
    contactEmail: isSyntheticCustomerAuthEmail(user.email)
      ? contactEmail
      : user.email?.trim() || null,
    deliveryAddress: nextDeliveryAddress,
  };
}

/** Cambia la contraseña del cliente (teléfono+clave o email+clave). */
export async function changeCustomerPassword(input: {
  storeSlug: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangeCustomerPasswordResult> {
  const currentPassword = input.currentPassword;
  const passwordValidation = validateCustomerPasswordPair(
    input.newPassword,
    input.confirmPassword,
  );
  if (!passwordValidation.ok) {
    return { ok: false, error: passwordValidation.error };
  }

  if (!currentPassword) {
    return { ok: false, error: "Ingresa tu contraseña actual." };
  }

  if (currentPassword === passwordValidation.password) {
    return {
      ok: false,
      error: "La nueva contraseña debe ser diferente a la actual.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  if (!customerCanManagePassword(user)) {
    return {
      ok: false,
      error: "Tu cuenta no usa contraseña. Inicia sesión con Google u otro método.",
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: passwordValidation.password,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      [CUSTOMER_PASSWORD_SET_META_KEY]: true,
    },
  });

  revalidatePath(getStoreCustomerAccountPath(input.storeSlug, "perfil"));
  revalidatePath(`/c/${input.storeSlug}/perfil`);

  return { ok: true };
}

export { CUSTOMER_MIN_PASSWORD_LENGTH };
