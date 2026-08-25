"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupplierHubUser } from "@/lib/supplier/require-session";
import {
  validateSupplierPickupFields,
  type SupplierHubProfile,
} from "@/lib/supplier/profile-types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

const PROFILE_SELECT =
  "user_id, company_name, contact_name, email, phone, warehouse_address, pickup_hours";

const PROFILE_SELECT_FALLBACK =
  "user_id, company_name, contact_name, email, phone";

function mapProfile(row: Record<string, unknown>): SupplierHubProfile {
  return {
    userId: String(row.user_id ?? ""),
    companyName: String(row.company_name ?? "").trim(),
    contactName: String(row.contact_name ?? "").trim(),
    email: String(row.email ?? "").trim(),
    phone: String(row.phone ?? "").trim(),
    warehouseAddress: String(row.warehouse_address ?? "").trim(),
    pickupHours: String(row.pickup_hours ?? "").trim(),
  };
}

export async function getSupplierHubProfile(): Promise<
  ActionResult<{ profile: SupplierHubProfile }>
> {
  const auth = await requireSupplierHubUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const admin = createAdminClient();
  const full = await admin
    .from("supplier_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!full.error && full.data) {
    return { profile: mapProfile(full.data as Record<string, unknown>) };
  }

  const missingColumns =
    Boolean(full.error?.message) &&
    (full.error!.message.includes("warehouse_address") ||
      full.error!.message.includes("pickup_hours"));

  if (!missingColumns) {
    return { error: full.error?.message ?? "No se encontró el perfil." };
  }

  const fallback = await admin
    .from("supplier_profiles")
    .select(PROFILE_SELECT_FALLBACK)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (fallback.error || !fallback.data) {
    return { error: fallback.error?.message ?? "No se encontró el perfil." };
  }

  return { profile: mapProfile(fallback.data as Record<string, unknown>) };
}

export async function saveSupplierHubProfile(input: {
  warehouseAddress: string;
  pickupHours: string;
}): Promise<ActionResult<{ profile: SupplierHubProfile }>> {
  const auth = await requireSupplierHubUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const validated = validateSupplierPickupFields(input);
  if (!validated.ok) return { error: validated.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_profiles")
    .update({
      warehouse_address: validated.warehouseAddress,
      pickup_hours: validated.pickupHours,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.user.id);

  if (error) {
    if (
      error.message.includes("warehouse_address") ||
      error.message.includes("pickup_hours")
    ) {
      return {
        error:
          "Falta aplicar la migración de dirección de recogida. Contacta a soporte.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/proveedor/dashboard/hub/configuracion");
  revalidatePath("/proveedor/dashboard/hub/pedidos");
  revalidatePath("/admin/dashboard");

  return getSupplierHubProfile();
}
