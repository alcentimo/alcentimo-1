"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { SUPPLIER_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import {
  isSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";

export type SupplierRegisterResult =
  | { ok: true; redirectTo: string }
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

function isExistingUserError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists") ||
    normalized.includes("duplicate")
  );
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

async function upsertSupplierProfile(input: {
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  productCategory: SupplierProductCategory;
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
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[supplier-register-profile]", error.message);
    return {
      ok: false,
      error:
        "Tu cuenta se creó, pero no pudimos guardar el perfil de proveedor. Contacta soporte.",
    };
  }

  return { ok: true };
}

/**
 * Registro de proveedor/mayorista: crea cuenta, perfil y sesión,
 * luego redirige a /proveedor/dashboard.
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
    const admin = createAdminClient();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: contactName,
          company_name: companyName,
          phone,
          product_category: productCategory,
          role: "supplier",
        },
      });

    let userId = created.user?.id ?? null;

    if (createError) {
      if (!isExistingUserError(createError.message)) {
        return { ok: false, error: formatAuthError(createError.message) };
      }

      return {
        ok: false,
        error:
          "Ya existe una cuenta con este correo. Inicia sesión para acceder al panel de proveedores.",
      };
    }

    if (!userId) {
      return {
        ok: false,
        error: "No se pudo crear la cuenta. Intenta de nuevo.",
      };
    }

    const supabase = await createClient();
    const { data: sessionData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !sessionData.session) {
      return {
        ok: false,
        error:
          "La cuenta se creó, pero no pudimos iniciar sesión. Prueba desde Iniciar sesión.",
      };
    }

    userId = sessionData.user.id;

    try {
      await ensureUserProfile(supabase);
    } catch {
      // El trigger suele crear el perfil; no bloquear el registro.
    }

    const profileResult = await upsertSupplierProfile({
      userId,
      companyName,
      contactName,
      email,
      phone,
      productCategory,
    });

    if (!profileResult.ok) return profileResult;

    return { ok: true, redirectTo: SUPPLIER_POST_AUTH_PATH };
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
