"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  mergeStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { uploadStoreAssetImage, uploadStoreLogoImage, removeStoreLogoAssets } from "@/lib/storage";
import { isValidStoreSlug } from "@/lib/stores/slug";
import { slugify } from "@/lib/slugify";
import { syncStoreProductCategories } from "@/lib/products/rubro-categories";
import { isValidStoreRubro, normalizeStoreRubro } from "@/src/config/categories";
import {
  getFirstPaymentValidationError,
  validatePaymentsSettings,
} from "@/lib/payments/validate-payment-fields";
import type {
  ContactSettings,
  CatalogCurrencySettings,
  CatalogDesignSettings,
  LocationHoursSettings,
  MessageTemplatesSettings,
  PaymentsSettings,
  ShippingSettings,
  StoredPromotion,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";
import {
  normalizeCatalogLayout,
  normalizeCatalogPrimaryColor,
} from "@/lib/store-settings/catalog-theme";

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

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/pedidos");
  revalidatePublicStorePaths(store.slug);

  return { success: true };
}

export async function saveCatalogDesignSettings(
  design: CatalogDesignSettings,
): Promise<SettingsActionResult> {
  return persistSettingsPatch({
    catalogDesign: {
      primaryColor: normalizeCatalogPrimaryColor(design.primaryColor),
      layout: normalizeCatalogLayout(design.layout),
    },
  });
}

export async function saveCatalogCurrencySettings(
  catalogCurrency: CatalogCurrencySettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ catalogCurrency });
  return persistSettingsPatch({ catalogCurrency: normalized.catalogCurrency });
}

export async function saveMessageTemplatesSettings(
  messageTemplates: MessageTemplatesSettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ messageTemplates });
  return persistSettingsPatch({
    messageTemplates: normalized.messageTemplates,
  });
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

export async function saveLocationHoursSettings(input: {
  locationHours: LocationHoursSettings;
  whatsappPhone?: string;
}): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({
    locationHours: input.locationHours,
    contact:
      typeof input.whatsappPhone === "string"
        ? { whatsappPhone: input.whatsappPhone.trim() }
        : undefined,
  });

  return persistSettingsPatch({
    locationHours: normalized.locationHours,
    ...(typeof input.whatsappPhone === "string"
      ? { contact: normalized.contact }
      : {}),
  });
}

export interface LocationLogisticsSettingsInput {
  locationHours: LocationHoursSettings;
  shipping: ShippingSettings;
  whatsappPhone?: string;
}

export async function saveLocationLogisticsSettings(
  input: LocationLogisticsSettingsInput,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({
    locationHours: input.locationHours,
    shipping: input.shipping,
    contact:
      typeof input.whatsappPhone === "string"
        ? { whatsappPhone: input.whatsappPhone.trim() }
        : undefined,
  });

  return persistSettingsPatch({
    locationHours: normalized.locationHours,
    shipping: normalized.shipping,
    ...(typeof input.whatsappPhone === "string"
      ? { contact: normalized.contact }
      : {}),
  });
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

export type SlugAvailabilityResult = {
  available: boolean;
  error?: string;
};

export async function checkStoreSlugAvailability(
  slug: string,
): Promise<SlugAvailabilityResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { available: false, error: auth.error };
  }

  const trimmed = slug.trim();
  if (!trimmed) {
    return { available: false, error: "El enlace no puede estar vacío." };
  }

  if (!isValidStoreSlug(trimmed)) {
    return { available: false, error: "El enlace solo puede usar letras minúsculas, números y guiones." };
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", trimmed)
    .maybeSingle();

  if (error) {
    return { available: false, error: error.message };
  }

  if (!data || data.id === auth.store.id) {
    return { available: true };
  }

  return { available: false };
}

export async function uploadStoreLogo(
  formData: FormData,
): Promise<{ url?: string; warning?: string; error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen para el logo." };
  }

  const upload = await uploadStoreLogoImage(supabase, auth.store.id, file);
  if (upload.error || !upload.url) {
    return { error: upload.error ?? "No se pudo subir el logo." };
  }

  const { error: updateError } = await supabase
    .from("stores")
    .update({
      logo_url: upload.url,
      pwa_icon_192_url: upload.pwaIcon192Url ?? null,
      pwa_icon_512_url: upload.pwaIcon512Url ?? null,
    })
    .eq("id", auth.store.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePublicStorePaths(auth.store.slug);

  return {
    url: upload.url,
    warning: upload.warning,
  };
}

export async function clearStoreLogo(): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  try {
    await removeStoreLogoAssets(supabase, auth.store.id);
  } catch {
    // Si falla el borrado en storage, igual limpiamos las URLs en la tienda.
  }

  const { error } = await supabase
    .from("stores")
    .update({
      logo_url: null,
      pwa_icon_192_url: null,
      pwa_icon_512_url: null,
    })
    .eq("id", auth.store.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePublicStorePaths(auth.store.slug);
  return { success: true };
}

function revalidatePublicStorePaths(slug: string) {
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/tienda/${slug}`);
}

export interface GeneralStoreSettingsInput {
  name: string;
  slug: string;
  logoUrl: string | null;
  description?: string;
  rubroTienda: string;
}

export async function saveGeneralStoreSettings(
  input: GeneralStoreSettingsInput,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { store } = auth;
  const name = input.name.trim();
  const slug = slugify(input.slug.trim() || name);
  const logoUrl = input.logoUrl?.trim() || null;
  const description =
    typeof input.description === "string" ? input.description.trim() : undefined;

  if (!name) {
    return { error: "El nombre de la tienda es obligatorio." };
  }

  if (!slug || !isValidStoreSlug(slug)) {
    return { error: "El enlace de la tienda no es válido." };
  }

  const rubroTienda = input.rubroTienda.trim().toLowerCase();
  if (!isValidStoreRubro(rubroTienda)) {
    return { error: "Selecciona el rubro de tu tienda." };
  }

  const availability = await checkStoreSlugAvailability(slug);
  if (!availability.available) {
    return {
      error:
        availability.error ??
        "Este enlace ya está registrado por otro negocio.",
    };
  }

  const previousSlug = store.slug;

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      name,
      slug,
      logo_url: logoUrl,
      rubro_tienda: rubroTienda,
      ...(description !== undefined ? { description: description || null } : {}),
    })
    .eq("id", store.id);

  if (storeError) {
    if (storeError.code === "23505") {
      return { error: "Este enlace ya está registrado por otro negocio." };
    }
    return { error: storeError.message };
  }

  const sync = await syncStoreProductCategories(
    supabase,
    store.id,
    normalizeStoreRubro(rubroTienda),
  );
  if (sync.error) return { error: sync.error };

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/productos/nuevo");
  revalidatePublicStorePaths(slug);
  if (previousSlug !== slug) {
    revalidatePublicStorePaths(previousSlug);
  }

  return { success: true };
}
