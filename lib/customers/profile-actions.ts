"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCustomerProfile } from "@/lib/customers/ensure-customer-profile";
import {
  CUSTOMER_DELIVERY_ADDRESS_MAX,
  CUSTOMER_MIN_PASSWORD_LENGTH,
  CUSTOMER_PASSWORD_SET_META_KEY,
  isSyntheticCustomerAuthEmail,
  validateCustomerEmailInput,
  validateCustomerPasswordPair,
  validateCustomerPhoneInput,
} from "@/lib/customers/phone-auth";
import { resolveCustomerPasswordCapability } from "@/lib/customers/resolve-customer-password-capability";
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

function toActionError(error: unknown, fallback: string): CustomerProfileActionError {
  if (error instanceof Error && error.message.trim()) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}

export async function saveCustomerProfile(input: {
  storeSlug: string;
  displayName: string;
  phone: string;
  contactEmail?: string | null;
  deliveryAddress?: string | null;
  requirePhone?: boolean;
}): Promise<SaveCustomerProfileResult> {
  try {
    const storeSlug = input.storeSlug.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const deliveryAddressRaw = input.deliveryAddress?.trim() ?? "";
    const requirePhone = input.requirePhone !== false;

    if (!storeSlug) {
      return { ok: false, error: "Tienda no válida." };
    }

    if (displayName.length < 2) {
      return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
    }

    if (deliveryAddressRaw.length > CUSTOMER_DELIVERY_ADDRESS_MAX) {
      return {
        ok: false,
        error: `La dirección no puede superar ${CUSTOMER_DELIVERY_ADDRESS_MAX} caracteres.`,
      };
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { ok: false, error: "Debes iniciar sesión para guardar tu perfil." };
    }

    const result = await ensureCustomerProfile(supabase, user, storeSlug, {
      displayName,
      // null explícito = limpiar teléfono cuando es opcional.
      phone,
      requireDisplayName: true,
      requirePhone,
      honorExplicitPhone: true,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const nextDeliveryAddress =
      deliveryAddressRaw.length > 0
        ? deliveryAddressRaw.slice(0, CUSTOMER_DELIVERY_ADDRESS_MAX)
        : null;

    const { data: updatedRows, error: updateError } = await supabase
      .from("customer_profiles")
      .update({
        delivery_address: nextDeliveryAddress,
        display_name: displayName.slice(0, 120),
        phone: phone ? phone.slice(0, 40) : null,
      })
      .eq("user_id", user.id)
      .eq("store_id", result.storeId)
      .select("id");

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    if (!updatedRows?.length) {
      return {
        ok: false,
        error: "No se pudo actualizar el perfil. Recarga e inténtalo de nuevo.",
      };
    }

    // Metadata Auth (correo de contacto opcional / teléfono) — no debe tumbar el guardado.
    try {
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

      const { error: metaError } = await admin.auth.admin.updateUserById(
        user.id,
        { user_metadata: nextMetadata },
      );

      if (metaError) {
        console.error(
          "[saveCustomerProfile] metadata update failed",
          metaError.message,
        );
      }
    } catch (metaUpdateError) {
      console.error("[saveCustomerProfile] metadata update failed", metaUpdateError);
    }

    revalidatePath(getStoreCustomerAccountPath(storeSlug, "perfil"));
    revalidatePath(`/c/${storeSlug}/perfil`);
    revalidatePath(`/c/${storeSlug}`);
    revalidatePath(getStoreCustomerAccountPath(storeSlug, "cuenta"));
    revalidatePath("/dashboard/clientes");

    return {
      ok: true,
      displayName: displayName.slice(0, 120),
      phone,
      contactEmail: isSyntheticCustomerAuthEmail(user.email)
        ? contactEmail
        : user.email?.trim() || null,
      deliveryAddress: nextDeliveryAddress,
    };
  } catch (error) {
    console.error("[saveCustomerProfile]", error);
    return toActionError(
      error,
      "No se pudo guardar el perfil. Inténtalo de nuevo.",
    );
  }
}

/** Cambia la contraseña del cliente (teléfono+clave o email+clave). */
export async function changeCustomerPassword(input: {
  storeSlug: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ChangeCustomerPasswordResult> {
  try {
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

    const capability = await resolveCustomerPasswordCapability(user);
    if (!capability.canChangePassword) {
      return {
        ok: false,
        error: `Tu cuenta inicia sesión con ${capability.externalProviderLabel}. La contraseña la gestiona ese proveedor.`,
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

    try {
      const admin = createAdminClient();
      const { data: latest } = await admin.auth.admin.getUserById(user.id);
      const latestUser = latest.user ?? user;

      const { error: metaError } = await admin.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...(latestUser.user_metadata ?? {}),
            [CUSTOMER_PASSWORD_SET_META_KEY]: true,
          },
        },
      );

      if (metaError) {
        console.error(
          "[changeCustomerPassword] metadata update failed",
          metaError.message,
        );
      }
    } catch (metaUpdateError) {
      console.error(
        "[changeCustomerPassword] metadata update failed",
        metaUpdateError,
      );
    }

    revalidatePath(getStoreCustomerAccountPath(input.storeSlug, "perfil"));
    revalidatePath(`/c/${input.storeSlug}/perfil`);

    return { ok: true };
  } catch (error) {
    console.error("[changeCustomerPassword]", error);
    return toActionError(
      error,
      "No se pudo actualizar la contraseña. Inténtalo de nuevo.",
    );
  }
}

export { CUSTOMER_MIN_PASSWORD_LENGTH };
