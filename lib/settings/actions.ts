"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  mergeStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { uploadStoreAssetImage } from "@/lib/storage";
import {
  getFirstPaymentValidationError,
  validatePaymentsSettings,
} from "@/lib/payments/validate-payment-fields";
import type {
  ContactSettings,
  PaymentsSettings,
  ShippingSettings,
  StoredPromotion,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";

export type SettingsActionResult = {
  error?: string;
  success?: boolean;
};

async function persistSettingsPatch(
  patch: Partial<StoreSettingsConfig>,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { store } = auth;

  const current = await getStoreSettingsConfig(supabase, store.id);
  const merged = mergeStoreSettingsConfig(current, patch);

  const { error } = await supabase.from("store_settings").upsert(
    {
      store_id: store.id,
      config: merged,
    },
    { onConflict: "store_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/tienda/${store.slug}`);

  return { success: true };
}

export async function saveShippingSettings(
  shipping: ShippingSettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ shipping });
  return persistSettingsPatch({ shipping: normalized.shipping });
}

export type SavePaymentsOptions = {
  /** Solo valida al guardar el formulario; los toggles omiten validación. */
  validate?: boolean;
};

export async function savePaymentsSettings(
  payments: PaymentsSettings,
  options?: SavePaymentsOptions,
): Promise<SettingsActionResult> {
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

  return persistSettingsPatch({ payments: normalized.payments });
}

export async function saveContactSettings(
  contact: ContactSettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ contact });
  return persistSettingsPatch({ contact: normalized.contact });
}

export async function savePromotionsSettings(
  promotions: StoredPromotion[],
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ promotions });
  return persistSettingsPatch({ promotions: normalized.promotions });
}

export async function uploadPaymentQrImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen de código QR." };
  }

  return uploadStoreAssetImage(supabase, auth.store.id, file, "payment-qr");
}
