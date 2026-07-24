"use server";

import { randomBytes } from "crypto";
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
  isSyntheticCustomerAuthEmail,
  validateCustomerPhoneInput,
  validateCustomerRegistrationInput,
} from "@/lib/customers/phone-auth";
import { markCatalogVisitRegistered } from "@/lib/analytics/track-catalog-visit";

export type LinkCustomerToStoreResult =
  | { ok: true; redirectTo: string }
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

async function establishPasswordlessSession(authEmail: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const supabase = await createClient();
  const password = randomBytes(32).toString("hex");

  const { error: createError } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
  });

  if (!createError) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (signInError) {
      return { ok: false, error: signInError.message };
    }

    return { ok: true };
  }

  if (!isExistingUserError(createError.message)) {
    return { ok: false, error: createError.message };
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink(
    {
      type: "magiclink",
      email: authEmail,
    },
  );

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return {
      ok: false,
      error: linkError?.message ?? "No se pudo iniciar sesión con tu teléfono.",
    };
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (otpError) {
    return { ok: false, error: otpError.message };
  }

  return { ok: true };
}

async function finalizeLinkedCustomer(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName: string;
  phone: string;
  contactEmail?: string | null;
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

  return {
    ok: true,
    redirectTo: sanitizeNextPath(input.nextPath, result.storeSlug),
  };
}

/** Registro o acceso instantáneo con nombre + WhatsApp (sin contraseña). */
export async function quickRegisterOrSignInCustomer(input: {
  storeSlug: string;
  nextPath?: string | null;
  displayName: string;
  phone: string;
  email?: string | null;
}): Promise<LinkCustomerToStoreResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  if (!storeSlug) {
    return { ok: false, error: "Enlace de registro inválido: falta la tienda." };
  }

  const validation = validateCustomerRegistrationInput(input);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  try {
    const authEmail = buildCustomerAuthEmail(validation.phone);
    const sessionResult = await establishPasswordlessSession(authEmail);

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
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al registrarte.";
    return { ok: false, error: message };
  }
}

export type InlineCustomerAuthResult =
  | { ok: true; displayName: string; phone: string; deliveryAddress?: string | null }
  | { ok: false; error: string };

/** Igual que quickRegisterOrSignInCustomer pero sin redirección (checkout embebido). */
export async function quickRegisterOrSignInCustomerInline(input: {
  storeSlug: string;
  displayName: string;
  phone: string;
}): Promise<InlineCustomerAuthResult> {
  const result = await quickRegisterOrSignInCustomer({
    storeSlug: input.storeSlug,
    displayName: input.displayName,
    phone: input.phone,
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

  const store = await resolveActiveStoreBySlug(supabase, input.storeSlug.trim().toLowerCase());
  if (!store) {
    return {
      ok: true,
      displayName: input.displayName.trim(),
      phone: input.phone.trim(),
    };
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("display_name, phone, delivery_address")
    .eq("user_id", user.id)
    .eq("store_id", store.id)
    .maybeSingle();

  return {
    ok: true,
    displayName: profile?.display_name?.trim() || input.displayName.trim(),
    phone: profile?.phone?.trim() || input.phone.trim(),
    deliveryAddress: profile?.delivery_address?.trim() || null,
  };
}

/** Tras Google OAuth: completa WhatsApp obligatorio antes de vincular la tienda. */
export async function completeCustomerPhone(input: {
  storeSlug: string;
  nextPath?: string | null;
  phone: string;
  displayName?: string | null;
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
