"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import {
  validateCustomerPhoneInput,
  validateCustomerVerificationFields,
} from "@/lib/customers/phone-auth";

function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_AUTH_BYPASS === "true"
  );
}

export type DevSignUpResult =
  | { ok: true }
  | { ok: false; error: string };

export type DevSignUpVerificationInput = {
  requireVerificationFields?: boolean;
  displayName?: string;
  documentId?: string;
  phone?: string;
  businessName?: string;
  city?: string;
  state?: string;
  socialUrl?: string;
};

/**
 * Crea un usuario ya confirmado (sin enviar email) y abre sesión.
 * Solo funciona en desarrollo con ALLOW_DEV_AUTH_BYPASS=true.
 */
export async function devSignUpAndSignIn(
  email: string,
  password: string,
  verification?: DevSignUpVerificationInput,
): Promise<DevSignUpResult> {
  if (!isDevBypassEnabled()) {
    return {
      ok: false,
      error:
        "El registro sin confirmación solo está disponible en desarrollo con ALLOW_DEV_AUTH_BYPASS=true.",
    };
  }

  try {
    let userMetadata: Record<string, unknown> | undefined;

    if (verification?.requireVerificationFields) {
      const displayName = verification.displayName?.trim() ?? "";
      if (displayName.length < 2) {
        return {
          ok: false,
          error: "Indica tu nombre y apellido (mínimo 2 caracteres).",
        };
      }

      const phoneValidation = validateCustomerPhoneInput(verification.phone ?? "");
      if (!phoneValidation.ok) {
        return { ok: false, error: phoneValidation.error };
      }

      const verified = validateCustomerVerificationFields({
        documentId: verification.documentId ?? "",
        businessName: verification.businessName ?? "",
        city: verification.city ?? "",
        state: verification.state ?? "",
        socialUrl: verification.socialUrl ?? "",
      });
      if (!verified.ok) {
        return { ok: false, error: verified.error };
      }

      userMetadata = {
        display_name: displayName.slice(0, 120),
        full_name: displayName.slice(0, 120),
        phone: phoneValidation.phone,
        document_id: verified.documentId,
        business_name: verified.businessName,
        store_name: verified.businessName,
        city: verified.city,
        state: verified.state,
        social_url: verified.socialUrl,
        registration_verified: true,
      };
    }

    const admin = createAdminClient();

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...(userMetadata ? { user_metadata: userMetadata } : {}),
    });

    if (
      createError &&
      !createError.message.toLowerCase().includes("already")
    ) {
      return { ok: false, error: createError.message };
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { ok: false, error: signInError.message };
    }

    await ensureUserProfile(supabase);

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al registrar.";
    return { ok: false, error: message };
  }
}
