"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPLIER_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import {
  EMAIL_VERIFICATION_SENT_MESSAGE,
} from "@/lib/auth/email-verified";
import { sendSignupConfirmationEmailForPath } from "@/lib/auth/send-signup-confirmation";
import { ensureAuthUserForSupplier } from "@/lib/supplier/auth-session";
import {
  isSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import { hashSupplierPassword } from "@/lib/supplier/password";

/** Metadata que marca la sesión como mayorista (no cliente de tienda). */
const SUPPLIER_AUTH_METADATA = {
  role: "supplier",
  registration_type: "supplier",
} as const;

export type SupplierRegisterResult =
  | {
      ok: true;
      needsEmailConfirmation: true;
      email: string;
      notice: string;
      redirectTo?: undefined;
    }
  | {
      ok: true;
      needsEmailConfirmation?: false;
      requiresLogin: true;
      email: string;
      notice: string;
      redirectTo?: undefined;
    }
  | { ok: false; error: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}

function isValidCommercialPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export interface SupplierRegisterInput {
  companyName: string;
  contactName: string;
  email: string;
  password: string;
  phone: string;
  productCategory: string;
  acceptedLegalTerms: boolean;
}

function validateSupplierRegisterInput(input: SupplierRegisterInput):
  | {
      ok: true;
      companyName: string;
      contactName: string;
      email: string;
      password: string;
      phone: string;
      productCategory: SupplierProductCategory;
    }
  | { ok: false; error: string } {
  if (!input.acceptedLegalTerms) {
    return {
      ok: false,
      error:
        "Debes aceptar los Términos y Condiciones y la Política de Privacidad.",
    };
  }

  const companyName = input.companyName.trim();
  if (companyName.length < 2) {
    return { ok: false, error: "Indica el nombre de la empresa." };
  }

  const contactName = input.contactName.trim();
  if (contactName.length < 2) {
    return { ok: false, error: "Indica el nombre de contacto." };
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (!input.password || input.password.length < 6) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  const phone = normalizePhone(input.phone);
  if (!isValidCommercialPhone(phone)) {
    return {
      ok: false,
      error: "Indica un teléfono o WhatsApp comercial válido.",
    };
  }

  if (!isSupplierProductCategory(input.productCategory)) {
    return { ok: false, error: "Selecciona una categoría de productos." };
  }

  return {
    ok: true,
    companyName: companyName.slice(0, 120),
    contactName: contactName.slice(0, 120),
    email,
    password: input.password,
    phone: phone.slice(0, 40),
    productCategory: input.productCategory,
  };
}

async function findSupplierProfileByEmail(email: string): Promise<{
  userId: string;
  status: string;
} | null> {
  const admin = createAdminClient();
  const escaped = email
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("supplier_profiles")
    .select("user_id, status")
    .ilike("email", escaped)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[supplier-register-lookup]", error.message);
    return null;
  }

  if (!data?.user_id) return null;
  return {
    userId: String(data.user_id),
    status: typeof data.status === "string" ? data.status : "active",
  };
}

async function upsertSupplierProfile(input: {
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  productCategory: SupplierProductCategory;
  passwordHash: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("supplier_profiles").upsert(
    {
      user_id: input.userId,
      company_name: input.companyName,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone,
      product_category: input.productCategory,
      password_hash: input.passwordHash,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[supplier-register-profile]", error.message);
    if (
      error.message.toLowerCase().includes("unique") ||
      error.code === "23505"
    ) {
      return {
        ok: false,
        error:
          "Ya existe una cuenta de proveedor con este correo. Inicia sesión en el panel de proveedores.",
      };
    }
    return {
      ok: false,
      error:
        "No pudimos guardar el perfil de proveedor. Intenta de nuevo o contacta soporte.",
    };
  }

  return { ok: true };
}

/**
 * Registro de proveedor/mayorista con verificación obligatoria de correo.
 * No abre sesión: envía enlace de confirmación o pide iniciar sesión si ya
 * estaba verificado.
 */
export async function registerSupplierAction(
  input: SupplierRegisterInput,
): Promise<SupplierRegisterResult> {
  const validated = validateSupplierRegisterInput(input);
  if (!validated.ok) return validated;

  const {
    companyName,
    contactName,
    email,
    password,
    phone,
    productCategory,
  } = validated;

  try {
    const existingSupplier = await findSupplierProfileByEmail(email);
    if (existingSupplier?.status === "active") {
      return {
        ok: false,
        error:
          "Ya tienes cuenta de proveedor con este correo. Inicia sesión en el panel de proveedores.",
      };
    }

    const authUser = await ensureAuthUserForSupplier({
      email,
      password,
      metadata: {
        display_name: contactName,
        company_name: companyName,
        phone,
        product_category: productCategory,
        ...SUPPLIER_AUTH_METADATA,
      },
    });

    if (!authUser.ok) return authUser;

    const profileResult = await upsertSupplierProfile({
      userId: authUser.userId,
      companyName,
      contactName,
      email,
      phone,
      productCategory,
      passwordHash: hashSupplierPassword(password),
    });

    if (!profileResult.ok) return profileResult;

    if (authUser.emailConfirmed) {
      return {
        ok: true,
        requiresLogin: true,
        email,
        notice:
          "Tu cuenta de proveedor está lista. Confirma el acceso iniciando sesión (el correo ya estaba verificado).",
      };
    }

    const confirmation = await sendSignupConfirmationEmailForPath({
      email,
      password,
      postAuthPath: SUPPLIER_POST_AUTH_PATH,
    });

    if (!confirmation.ok) {
      return {
        ok: false,
        error: confirmation.error,
      };
    }

    return {
      ok: true,
      needsEmailConfirmation: true,
      email,
      notice: EMAIL_VERIFICATION_SENT_MESSAGE,
    };
  } catch (caught) {
    console.error("[registerSupplierAction]", caught);
    return {
      ok: false,
      error:
        caught instanceof Error
          ? caught.message
          : "No se pudo completar el registro de proveedor.",
    };
  }
}
