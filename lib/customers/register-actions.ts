"use server";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  resolveActiveStoreBySlug,
  resolveCustomerNextDestination,
} from "@/lib/customers/middleware-access";
import {
  ensureCustomerProfile,
  resolveCustomerStoreSlugFromNext,
} from "@/lib/customers/ensure-customer-profile";
import {
  buildCustomerAuthEmail,
  CUSTOMER_PASSWORD_SET_META_KEY,
  hasCustomerPasswordSet,
  isSyntheticCustomerAuthEmail,
  validateCustomerPassword,
  validateCustomerPhoneInput,
  validateCustomerRegistrationInput,
} from "@/lib/customers/phone-auth";
import { markCatalogVisitRegistered } from "@/lib/analytics/track-catalog-visit";
import { linkGuestOrdersToCustomer } from "@/lib/orders/link-guest-orders";

export type LinkCustomerToStoreResult =
  | { ok: true; redirectTo: string; displayName?: string; phone?: string }
  | { ok: false; error: string };

function sanitizeNextPath(
  nextPath: string | null | undefined,
  storeSlug: string,
): string {
  const slug = storeSlug.trim().toLowerCase();
  const resolvedSlug = resolveCustomerStoreSlugFromNext(nextPath, slug);
  if (resolvedSlug !== slug) {
    return resolveCustomerNextDestination(slug, null);
  }

  return resolveCustomerNextDestination(slug, nextPath);
}

function isExistingUserError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists")
  );
}

/** Obtiene el usuario Auth por email sintético sin enviar correo. */
async function lookupAuthUserByEmail(authEmail: string): Promise<User | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail,
  });

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

async function signInWithCustomerPassword(
  authEmail: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("invalid") ||
      message.includes("credentials") ||
      message.includes("password")
    ) {
      return {
        ok: false,
        error: "Teléfono o contraseña incorrectos.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Crea cuenta con contraseña o reclama una cuenta legacy sin clave definida.
 * No inicia sesión mágica ni genera claves aleatorias.
 */
async function establishPasswordSession(input: {
  authEmail: string;
  password: string;
  displayName: string;
  phone: string;
  allowLegacyPasswordClaim: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email: input.authEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: input.displayName,
      phone: input.phone,
      [CUSTOMER_PASSWORD_SET_META_KEY]: true,
    },
  });

  if (!createError) {
    return signInWithCustomerPassword(input.authEmail, input.password);
  }

  if (!isExistingUserError(createError.message)) {
    return { ok: false, error: createError.message };
  }

  const existingSignIn = await signInWithCustomerPassword(
    input.authEmail,
    input.password,
  );
  if (existingSignIn.ok) {
    return existingSignIn;
  }

  if (!input.allowLegacyPasswordClaim) {
    return {
      ok: false,
      error: "Ya tienes una cuenta. Inicia sesión con tu teléfono y contraseña.",
    };
  }

  const existingUser = await lookupAuthUserByEmail(input.authEmail);
  if (!existingUser) {
    return {
      ok: false,
      error: "Ya tienes una cuenta. Inicia sesión con tu teléfono y contraseña.",
    };
  }

  if (hasCustomerPasswordSet(existingUser.user_metadata)) {
    return {
      ok: false,
      error: "Ya tienes una cuenta. Inicia sesión con tu teléfono y contraseña.",
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existingUser.id,
    {
      password: input.password,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        display_name:
          input.displayName ||
          (typeof existingUser.user_metadata?.display_name === "string"
            ? existingUser.user_metadata.display_name
            : undefined),
        phone: input.phone,
        [CUSTOMER_PASSWORD_SET_META_KEY]: true,
      },
    },
  );

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return signInWithCustomerPassword(input.authEmail, input.password);
}

async function finalizeLinkedCustomer(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName: string;
  phone: string;
  contactEmail?: string | null;
  orderId?: string | null;
  markPasswordSet?: boolean;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Debes iniciar sesión para continuar." };
  }

  const admin = createAdminClient();
  const metadata: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    display_name: input.displayName,
    phone: input.phone,
    customer_store_slug: storeSlug,
  };

  if (input.contactEmail) {
    metadata.contact_email = input.contactEmail;
  }

  if (input.markPasswordSet) {
    metadata[CUSTOMER_PASSWORD_SET_META_KEY] = true;
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const result = await ensureCustomerProfile(supabase, user, storeSlug, {
    displayName: input.displayName,
    phone: input.phone,
    requireDisplayName: true,
    requirePhone: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await markCatalogVisitRegistered(result.storeSlug, user.id);

  try {
    await linkGuestOrdersToCustomer({
      storeSlug: result.storeSlug,
      userId: user.id,
      phone: input.phone,
      orderId: input.orderId,
    });
  } catch {
    // No bloquear registro si falla el vínculo de pedidos previos.
  }

  return {
    ok: true,
    redirectTo: sanitizeNextPath(input.nextPath, result.storeSlug),
    displayName: input.displayName,
    phone: input.phone,
  };
}

/** Inicio de sesión con teléfono + contraseña (sin SMS). */
export async function signInCustomerByPhone(input: {
  storeSlug: string;
  nextPath?: string | null;
  phone: string;
  password: string;
  orderId?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace inválido: falta la tienda." };
  }

  const phoneValidation = validateCustomerPhoneInput(input.phone);
  if (!phoneValidation.ok) {
    return { ok: false, error: phoneValidation.error };
  }

  const passwordValidation = validateCustomerPassword(input.password);
  if (!passwordValidation.ok) {
    return { ok: false, error: passwordValidation.error };
  }

  try {
    const authEmail = buildCustomerAuthEmail(phoneValidation.phone);
    let sessionResult = await signInWithCustomerPassword(
      authEmail,
      passwordValidation.password,
    );

    if (!sessionResult.ok) {
      const existingUser = await lookupAuthUserByEmail(authEmail);
      if (!existingUser) {
        return {
          ok: false,
          error: "No encontramos una cuenta con ese teléfono. Crea una cuenta.",
        };
      }

      if (!hasCustomerPasswordSet(existingUser.user_metadata)) {
        const admin = createAdminClient();
        const { error: updateError } = await admin.auth.admin.updateUserById(
          existingUser.id,
          {
            password: passwordValidation.password,
            user_metadata: {
              ...(existingUser.user_metadata ?? {}),
              [CUSTOMER_PASSWORD_SET_META_KEY]: true,
            },
          },
        );

        if (updateError) {
          return { ok: false, error: updateError.message };
        }

        sessionResult = await signInWithCustomerPassword(
          authEmail,
          passwordValidation.password,
        );
      }
    }

    if (!sessionResult.ok) {
      return sessionResult;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "No se pudo iniciar sesión." };
    }

    const metadata = user.user_metadata ?? {};
    const store = await resolveActiveStoreBySlug(supabase, storeSlug);

    let displayName =
      (typeof metadata.display_name === "string"
        ? metadata.display_name.trim()
        : "") ||
      (typeof metadata.full_name === "string" ? metadata.full_name.trim() : "");

    if ((!displayName || displayName.length < 2) && store) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .eq("store_id", store.id)
        .maybeSingle();

      displayName = profile?.display_name?.trim() || displayName;
    }

    if (!displayName || displayName.length < 2) {
      return {
        ok: false,
        error:
          "Tu cuenta necesita completar el nombre. Usa “Crear cuenta” con el mismo teléfono.",
      };
    }

    await ensureUserProfile(supabase);

    return finalizeLinkedCustomer({
      storeSlug,
      nextPath: input.nextPath,
      displayName: displayName.slice(0, 120),
      phone: phoneValidation.phone,
      contactEmail:
        typeof metadata.contact_email === "string"
          ? metadata.contact_email
          : isSyntheticCustomerAuthEmail(user.email)
            ? null
            : user.email,
      orderId: input.orderId,
      markPasswordSet: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al iniciar sesión.";
    return { ok: false, error: message };
  }
}

/** Registro con nombre + teléfono + contraseña (sin SMS ni acceso automático). */
export async function quickRegisterOrSignInCustomer(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  email?: string | null;
  orderId?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace de registro inválido: falta la tienda." };
  }

  const validation = validateCustomerRegistrationInput({
    displayName: input.displayName,
    phone: input.phone,
    email: input.email,
    password: input.password,
    confirmPassword: input.confirmPassword ?? input.password,
    requirePassword: true,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  if (!validation.password) {
    return { ok: false, error: "Define una contraseña para tu cuenta." };
  }

  try {
    const authEmail = buildCustomerAuthEmail(validation.phone);
    const sessionResult = await establishPasswordSession({
      authEmail,
      password: validation.password,
      displayName: validation.displayName,
      phone: validation.phone,
      allowLegacyPasswordClaim: true,
    });

    if (!sessionResult.ok) {
      return sessionResult;
    }

    const supabase = await createClient();
    await ensureUserProfile(supabase);

    return finalizeLinkedCustomer({
      storeSlug,
      nextPath: input.nextPath,
      displayName: validation.displayName,
      phone: validation.phone,
      contactEmail: validation.contactEmail,
      orderId: input.orderId,
      markPasswordSet: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al registrarte.";
    return { ok: false, error: message };
  }
}

export type InlineCustomerAuthResult =
  | {
      ok: true;
      displayName: string;
      phone: string;
      deliveryAddress?: string | null;
      preferredShippingMethod?: string | null;
      preferredShippingBranchCode?: string | null;
    }
  | { ok: false; error: string };

/** Igual que quickRegisterOrSignInCustomer pero sin redirección (checkout embebido). */
export async function quickRegisterOrSignInCustomerInline(input: {
  storeSlug: string;
  displayName: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  orderId?: string | null;
}): Promise<InlineCustomerAuthResult> {
  const result = await quickRegisterOrSignInCustomer({
    storeSlug: input.storeSlug,
    displayName: input.displayName,
    phone: input.phone,
    password: input.password,
    confirmPassword: input.confirmPassword ?? input.password,
    orderId: input.orderId,
  });

  if (!result.ok) {
    return result;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No se pudo iniciar sesión." };
  }

  const store = await resolveActiveStoreBySlug(
    supabase,
    input.storeSlug.trim().toLowerCase(),
  );
  if (!store) {
    return {
      ok: true,
      displayName: input.displayName.trim(),
      phone: input.phone.trim(),
    };
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select(
      "display_name, phone, delivery_address, preferred_shipping_method, preferred_shipping_branch_code",
    )
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .maybeSingle();

  return {
    ok: true,
    displayName: profile?.display_name?.trim() || input.displayName.trim(),
    phone: profile?.phone?.trim() || input.phone.trim(),
    deliveryAddress: profile?.delivery_address?.trim() || null,
    preferredShippingMethod:
      (profile?.preferred_shipping_method as string | null)?.trim() || null,
    preferredShippingBranchCode:
      (profile?.preferred_shipping_branch_code as string | null)?.trim() || null,
  };
}

/** Tras Google OAuth: completa WhatsApp obligatorio antes de vincular la tienda. */
export async function completeCustomerPhone(input: {
  storeSlug: string;
  nextPath?: string | null;
  phone: string;
  displayName?: string | null;
  orderId?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace de registro inválido: falta la tienda." };
  }

  const phoneValidation = validateCustomerPhoneInput(input.phone);
  if (!phoneValidation.ok) {
    return { ok: false, error: phoneValidation.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Debes iniciar sesión para continuar." };
  }

  const metadata = user.user_metadata ?? {};
  const displayName =
    input.displayName?.trim() ||
    (typeof metadata.display_name === "string" ? metadata.display_name.trim() : "") ||
    (typeof metadata.full_name === "string" ? metadata.full_name.trim() : "") ||
    user.email?.split("@")[0]?.trim() ||
    "Cliente";

  if (displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  return finalizeLinkedCustomer({
    storeSlug,
    nextPath: input.nextPath,
    displayName: displayName.slice(0, 120),
    phone: phoneValidation.phone,
    contactEmail:
      typeof metadata.contact_email === "string"
        ? metadata.contact_email
        : isSyntheticCustomerAuthEmail(user.email)
          ? null
          : user.email,
    orderId: input.orderId,
  });
}

/** Vincula la sesión actual a customer_profiles para la tienda del enlace. */
export async function linkCustomerToStore(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName?: string | null;
  phone?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace de registro inválido: falta la tienda." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Debes iniciar sesión para continuar." };
  }

  const result = await ensureCustomerProfile(supabase, user, storeSlug, {
    displayName: input.displayName,
    phone: input.phone,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    redirectTo: sanitizeNextPath(input.nextPath, result.storeSlug),
  };
}
