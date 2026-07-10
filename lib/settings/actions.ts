"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserStore } from "@/lib/stores";
import {
  mergeStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const store = await getUserStore(supabase);
  if (!store) {
    return { error: "No tienes una tienda asociada." };
  }

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

export async function savePaymentsSettings(
  payments: PaymentsSettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ payments });
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
