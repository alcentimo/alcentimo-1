"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import {
  defaultSupplierPaymentConfig,
  normalizeSupplierPaymentConfig,
  type SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireSupplierUser(): Promise<{
  error?: string;
  user?: { id: string };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const email = resolveSupplierAuthEmail(user);
  const access = checkSupplierAccess(email);
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  return { user: { id: user.id } };
}

export async function getSupplierPaymentConfig(): Promise<
  ActionResult<{ config: SupplierPaymentConfig }>
> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_payment_profiles")
    .select("payment_config")
    .eq("supplier_user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { config: defaultSupplierPaymentConfig() };
  }

  return {
    config: normalizeSupplierPaymentConfig(
      (data as { payment_config?: unknown }).payment_config,
    ),
  };
}

export async function saveSupplierPaymentConfig(
  input: SupplierPaymentConfig,
): Promise<ActionResult<{ config: SupplierPaymentConfig; ok: true }>> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const config = normalizeSupplierPaymentConfig(input);
  const admin = createAdminClient();
  const { error } = await admin.from("supplier_payment_profiles").upsert(
    {
      supplier_user_id: auth.user.id,
      payment_config: config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "supplier_user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/proveedor/dashboard");
  return { ok: true, config };
}

/** Lectura pública para comerciantes autenticados (pago directo al proveedor). */
export async function getSupplierPaymentConfigByUserId(
  supplierUserId: string,
): Promise<ActionResult<{ config: SupplierPaymentConfig }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  if (!supplierUserId.trim()) {
    return { error: "Proveedor inválido." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_payment_profiles")
    .select("payment_config")
    .eq("supplier_user_id", supplierUserId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return {
    config: normalizeSupplierPaymentConfig(
      (data as { payment_config?: unknown } | null)?.payment_config,
    ),
  };
}
