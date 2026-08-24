"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadStoreLogoImage, removeStoreLogoAssets } from "@/lib/storage";
import { STORE_DESCRIPTION_MAX_LENGTH } from "@/lib/stores/description";
import {
  getFirstPaymentValidationError,
  validatePaymentsSettings,
} from "@/lib/payments/validate-payment-fields";
import { normalizeStoreSettingsConfig } from "@/lib/store-settings/defaults";
import type {
  PaymentsSettings,
  ShippingSettings,
} from "@/lib/store-settings/types";
import type { SettingsActionResult } from "@/lib/settings/actions";
import { supplierPublicCatalogPath } from "@/lib/catalog/supplier-public-catalog";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { requireSupplierHubUser } from "@/lib/supplier/require-session";
import {
  defaultSupplierStorefrontConfig,
  normalizeSupplierStorefrontConfig,
  type SupplierPublicStorefront,
} from "@/lib/supplier/storefront-types";

function supplierLogoOwnerId(userId: string): string {
  return `supplier-${userId}`;
}

function revalidateStorefront(slug: string | null) {
  revalidatePath("/proveedor/dashboard");
  revalidatePath("/proveedor/dashboard/ajustes");
  if (slug) revalidatePath(supplierPublicCatalogPath(slug));
}

async function requireEnabledStorefront(): Promise<
  | { error: string; user?: undefined; storefront?: undefined }
  | { user: { id: string }; storefront: SupplierPublicStorefront }
> {
  const auth = await requireSupplierHubUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }
  const storefront = await getSupplierPublicStorefront(auth.user.id);
  if (!storefront) {
    return { error: "No se encontró el perfil de proveedor." };
  }
  if (!storefront.showPublicCatalog) {
    return {
      error:
        "La vitrina pública aún no está habilitada. Pide al administrador que la active.",
    };
  }
  return { user: auth.user, storefront };
}

export async function saveSupplierStorefrontIdentity(input: {
  tradeName: string;
  description: string;
}): Promise<SettingsActionResult> {
  const gate = await requireEnabledStorefront();
  if ("error" in gate) return { error: gate.error };

  const tradeName = input.tradeName.trim().slice(0, 80);
  if (tradeName.length < 2) {
    return { error: "El nombre comercial debe tener al menos 2 caracteres." };
  }
  const description = input.description
    .trim()
    .slice(0, STORE_DESCRIPTION_MAX_LENGTH);

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_profiles")
    .update({
      trade_name: tradeName,
      public_description: description,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", gate.user.id);

  if (error) return { error: error.message };
  revalidateStorefront(gate.storefront.publicCatalogSlug);
  return { success: true };
}

export async function saveSupplierStorefrontShipping(
  shipping: ShippingSettings,
): Promise<SettingsActionResult> {
  const gate = await requireEnabledStorefront();
  if ("error" in gate) return { error: gate.error };

  const current = gate.storefront;
  const normalized = normalizeStoreSettingsConfig({ shipping });
  const next = normalizeSupplierStorefrontConfig({
    shipping: normalized.shipping,
    payments: current.payments,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_profiles")
    .update({
      storefront_config: next,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", gate.user.id);

  if (error) return { error: error.message };
  revalidateStorefront(current.publicCatalogSlug);
  return { success: true };
}

export async function saveSupplierStorefrontPayments(
  payments: PaymentsSettings,
  options?: { validate?: boolean },
): Promise<SettingsActionResult> {
  const gate = await requireEnabledStorefront();
  if ("error" in gate) return { error: gate.error };

  const current = gate.storefront;
  const normalized = normalizeStoreSettingsConfig({ payments });
  const shouldValidate = options?.validate !== false;
  if (shouldValidate) {
    const validationErrors = validatePaymentsSettings(normalized.payments);
    if (Object.keys(validationErrors).length > 0) {
      return {
        error:
          getFirstPaymentValidationError(validationErrors) ??
          "Revisa los campos de los métodos de pago activos.",
      };
    }
  }

  const next = normalizeSupplierStorefrontConfig({
    shipping: current.shipping,
    payments: normalized.payments,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_profiles")
    .update({
      storefront_config: next,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", gate.user.id);

  if (error) return { error: error.message };
  revalidateStorefront(current.publicCatalogSlug);
  return { success: true };
}

export async function uploadSupplierStorefrontLogo(
  formData: FormData,
): Promise<{ url?: string; warning?: string; error?: string }> {
  const gate = await requireEnabledStorefront();
  if ("error" in gate) return { error: gate.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen para el logo." };
  }

  const admin = createAdminClient();
  const upload = await uploadStoreLogoImage(
    admin,
    supplierLogoOwnerId(gate.user.id),
    file,
  );
  if (upload.error || !upload.url) {
    return { error: upload.error ?? "No se pudo subir el logo." };
  }

  const { error } = await admin
    .from("supplier_profiles")
    .update({
      logo_url: upload.url,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", gate.user.id);

  if (error) return { error: error.message };
  revalidateStorefront(gate.storefront.publicCatalogSlug);
  return { url: upload.url, warning: upload.warning };
}

export async function clearSupplierStorefrontLogo(): Promise<SettingsActionResult> {
  const gate = await requireEnabledStorefront();
  if ("error" in gate) return { error: gate.error };

  const admin = createAdminClient();
  try {
    await removeStoreLogoAssets(admin, supplierLogoOwnerId(gate.user.id));
  } catch {
    // Sigue limpiando la URL aunque falle el storage.
  }

  const { error } = await admin
    .from("supplier_profiles")
    .update({
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", gate.user.id);

  if (error) return { error: error.message };
  revalidateStorefront(gate.storefront.publicCatalogSlug);
  return { success: true };
}

export async function getOwnSupplierStorefrontOrDefault() {
  const auth = await requireSupplierHubUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }
  const storefront = await getSupplierPublicStorefront(auth.user.id);
  if (!storefront) {
    return { error: "No se encontró el perfil de proveedor." };
  }
  return {
    storefront: {
      ...storefront,
      shipping:
        storefront.shipping ?? defaultSupplierStorefrontConfig().shipping,
      payments:
        storefront.payments ?? defaultSupplierStorefrontConfig().payments,
    },
  };
}
