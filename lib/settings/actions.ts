"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  mergeStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { normalizeHex6 } from "@/lib/store-settings/color-contrast";
import { normalizeCatalogLayout } from "@/lib/store-settings/catalog-theme";
import { sanitizePromoBannerForStorage } from "@/lib/store-settings/promo-banner";
import { normalizeCatalogFaqDraft } from "@/lib/store-settings/catalog-faq";
import { sanitizeCatalogHeaderForStorage } from "@/lib/store-settings/catalog-header";
import { sanitizeAssistantAvatarForStorage } from "@/lib/store-settings/assistant-avatar";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { uploadCatalogBannerAssetImage, uploadStoreAssetImage, uploadStoreLogoImage, removeStoreLogoAssets } from "@/lib/storage";
import type { BannerImageVariant } from "@/lib/banner-image";
import {
  STORE_SLUG_UNAVAILABLE_MESSAGE,
  validateStoreSlugCandidate,
} from "@/lib/stores/slug-availability";
import { STORE_DESCRIPTION_MAX_LENGTH } from "@/lib/stores/description";
import { isValidStoreRubro, normalizeStoreRubro } from "@/src/config/categories";
import { syncStoreProductCategories } from "@/lib/products/rubro-categories";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";
import {
  getFirstPaymentValidationError,
  validatePaymentsSettings,
} from "@/lib/payments/validate-payment-fields";
import { scheduleStoreSubdomainRename } from "@/lib/domains/provision-store-subdomain";
import type {
  ContactSettings,
  CatalogAssistantAvatarSettings,
  CatalogCurrencySettings,
  CatalogDesignSettings,
  CheckoutSettings,
  DropshipPricingSettings,
  InterfacePreferencesSettings,
  LocationHoursSettings,
  MessageTemplatesSettings,
  PaymentsSettings,
  ShippingSettings,
  StoredPromotion,
  StoreSettingsConfig,
} from "@/lib/store-settings/types";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";

export type SettingsActionResult = {
  error?: string;
  success?: boolean;
  /** Rubro persistido tras guardar ajustes generales. */
  rubroTienda?: string;
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

  const current = await getStoreSettingsConfig(store.id);
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
  revalidatePath("/dashboard/asistente");
  revalidatePath("/dashboard/pedidos");
  revalidatePublicStorePaths(store.slug);

  return { success: true };
}

/** Guarda solo el avatar del asistente del catálogo (sin tocar el resto del diseño). */
export async function saveCatalogAssistantAvatarSettings(
  assistantAvatar: CatalogAssistantAvatarSettings,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const current = await getStoreSettingsConfig(auth.store.id);
  return persistSettingsPatch({
    catalogDesign: {
      ...current.catalogDesign,
      assistantAvatar: sanitizeAssistantAvatarForStorage(assistantAvatar),
    },
  });
}

/** Activa o desactiva el Asistente IA en el catálogo público. */
export async function saveAiAssistantEnabledSettings(
  aiAssistantEnabled: boolean,
): Promise<SettingsActionResult> {
  return persistSettingsPatch({
    aiAssistantEnabled: Boolean(aiAssistantEnabled),
  });
}

export async function saveCatalogDesignSettings(
  design: CatalogDesignSettings,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const current = await getStoreSettingsConfig(auth.store.id);
  const normalized = normalizeStoreSettingsConfig({ catalogDesign: design });
  const catalogDesign: CatalogDesignSettings = {
    theme: normalized.catalogDesign.theme,
    saleMode: normalized.catalogDesign.saleMode,
    visibility: normalized.catalogDesign.visibility,
    layout: normalizeCatalogLayout(
      design.layout ?? normalized.catalogDesign.layout,
    ),
    promoBanner: sanitizePromoBannerForStorage(
      design.promoBanner ?? normalized.catalogDesign.promoBanner,
      auth.store.slug,
    ),
    faq: normalizeCatalogFaqDraft(
      design.faq ?? normalized.catalogDesign.faq,
    ),
    header: sanitizeCatalogHeaderForStorage(
      design.header ?? normalized.catalogDesign.header,
    ),
    // El avatar se administra en Asistente IA; no sobrescribirlo desde Diseño.
    assistantAvatar: sanitizeAssistantAvatarForStorage(
      current.catalogDesign.assistantAvatar,
    ),
  };

  const customColor = design.primaryColor?.trim();
  if (customColor) {
    const hex = normalizeHex6(customColor);
    if (hex) {
      catalogDesign.primaryColor = hex;
    }
  }

  const merged: StoreSettingsConfig = {
    ...current,
    catalogDesign,
  };

  const { error } = await supabase.from("store_settings").upsert(
    {
      store_id: auth.store.id,
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
  revalidatePublicStorePaths(auth.store.slug);

  return { success: true };
}

export async function saveCatalogCurrencySettings(
  catalogCurrency: Partial<CatalogCurrencySettings>,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { error: auth.error };
  }

  const current = await getStoreSettingsConfig(auth.store.id);
  const normalized = normalizeStoreSettingsConfig({
    catalogCurrency: {
      ...current.catalogCurrency,
      ...catalogCurrency,
    },
  });
  return persistSettingsPatch({ catalogCurrency: normalized.catalogCurrency });
}

export async function saveDropshipPricingSettings(
  dropshipPricing: Partial<DropshipPricingSettings>,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { error: auth.error };
  }

  const feature = await requireDropshipFeatureAccess({
    email: auth.authUser.email,
  });
  if (!feature.ok) {
    return { error: feature.error };
  }

  const current = await getStoreSettingsConfig(auth.store.id);
  const normalized = normalizeStoreSettingsConfig({
    dropshipPricing: {
      ...current.dropshipPricing,
      ...dropshipPricing,
    },
  });

  if (
    normalized.dropshipPricing.enabled &&
    normalized.dropshipPricing.marginValue < 0
  ) {
    return { error: "El margen debe ser mayor o igual a 0." };
  }

  return persistSettingsPatch({
    dropshipPricing: normalized.dropshipPricing,
  });
}

export async function saveCheckoutSettings(
  checkout: CheckoutSettings,
): Promise<SettingsActionResult> {
  // El modo de clientes ya no es configurable: siempre híbrido.
  const normalized = normalizeStoreSettingsConfig({
    checkout: { ...checkout, accountMode: "hibrido" },
  });
  return persistSettingsPatch({
    checkout: { ...normalized.checkout, accountMode: "hibrido" },
  });
}

export async function saveInterfacePreferencesSettings(
  interfacePreferences: InterfacePreferencesSettings,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({ interfacePreferences });
  return persistSettingsPatch({
    interfacePreferences: normalized.interfacePreferences,
  });
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
  const next = {
    ...normalized.shipping,
    pricingMode: "cod" as const,
  };

  if (next.freeShippingEnabled && next.freeShippingMinUsd <= 0) {
    return {
      error: "Indica un monto mínimo mayor a $0 para el envío gratis.",
    };
  }

  return persistSettingsPatch({ shipping: next });
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
  whatsappPhones?: string[];
  whatsappChatWelcome?: string;
}): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({
    locationHours: input.locationHours,
    contact:
      Array.isArray(input.whatsappPhones) ||
      typeof input.whatsappPhone === "string" ||
      typeof input.whatsappChatWelcome === "string"
        ? {
            whatsappPhone:
              typeof input.whatsappPhone === "string"
                ? input.whatsappPhone.trim()
                : input.whatsappPhones?.[0]?.trim() ?? "",
            whatsappPhones: Array.isArray(input.whatsappPhones)
              ? input.whatsappPhones
              : undefined,
            ...(typeof input.whatsappChatWelcome === "string"
              ? { whatsappChatWelcome: input.whatsappChatWelcome }
              : {}),
          }
        : undefined,
  });

  return persistSettingsPatch({
    locationHours: normalized.locationHours,
    ...(Array.isArray(input.whatsappPhones) ||
    typeof input.whatsappPhone === "string" ||
    typeof input.whatsappChatWelcome === "string"
      ? { contact: normalized.contact }
      : {}),
  });
}

export interface LocationLogisticsSettingsInput {
  locationHours: LocationHoursSettings;
  shipping: ShippingSettings;
  whatsappPhone?: string;
  whatsappPhones?: string[];
}

export async function saveLocationLogisticsSettings(
  input: LocationLogisticsSettingsInput,
): Promise<SettingsActionResult> {
  const normalized = normalizeStoreSettingsConfig({
    locationHours: input.locationHours,
    shipping: input.shipping,
    contact:
      Array.isArray(input.whatsappPhones) || typeof input.whatsappPhone === "string"
        ? {
            whatsappPhone:
              typeof input.whatsappPhone === "string"
                ? input.whatsappPhone.trim()
                : input.whatsappPhones?.[0]?.trim() ?? "",
            whatsappPhones: Array.isArray(input.whatsappPhones)
              ? input.whatsappPhones
              : undefined,
          }
        : undefined,
  });

  return persistSettingsPatch({
    locationHours: normalized.locationHours,
    shipping: normalized.shipping,
    ...(Array.isArray(input.whatsappPhones) || typeof input.whatsappPhone === "string"
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

export async function uploadCatalogBannerImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen para el banner." };
  }

  const variantRaw = formData.get("variant");
  const variant: BannerImageVariant =
    variantRaw === "desktop" ? "desktop" : "mobile";

  return uploadCatalogBannerAssetImage(
    supabase,
    auth.store.id,
    file,
    variant,
  );
}

export async function uploadCatalogAssistantAvatarImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen para el avatar." };
  }

  return uploadStoreAssetImage(supabase, auth.store.id, file, "assistant-avatar");
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

  const validation = validateStoreSlugCandidate(slug);
  if (!validation.ok) {
    return { available: false, error: validation.error };
  }

  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", validation.slug)
    .maybeSingle();

  if (error) {
    return { available: false, error: error.message };
  }

  if (!data || data.id === auth.store.id) {
    return { available: true };
  }

  return { available: false, error: STORE_SLUG_UNAVAILABLE_MESSAGE };
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
  revalidatePath(`/c/${slug}`, "layout");
  revalidatePath(`/c/${slug}/manifest.json`);
  revalidatePath(`/tienda/${slug}`);
}

export interface GeneralStoreSettingsInput {
  name: string;
  slug: string;
  /** Si se omite, no se modifica el logo existente. */
  logoUrl?: string | null;
  description?: string;
  rubroTienda: string;
  enablePcBuilder?: boolean;
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
  const slugValidation = validateStoreSlugCandidate(input.slug.trim() || name);
  const description =
    typeof input.description === "string"
      ? input.description.trim().slice(0, STORE_DESCRIPTION_MAX_LENGTH)
      : undefined;

  if (!name) {
    return { error: "El nombre de la tienda es obligatorio." };
  }

  if (!slugValidation.ok) {
    return { error: slugValidation.error };
  }

  const slug = slugValidation.slug;

  const rubroTienda = input.rubroTienda.trim().toLowerCase();
  if (!isValidStoreRubro(rubroTienda)) {
    return { error: "Selecciona el rubro de tu tienda." };
  }

  const availability = await checkStoreSlugAvailability(slug);
  if (!availability.available) {
    return {
      error: availability.error ?? STORE_SLUG_UNAVAILABLE_MESSAGE,
    };
  }

  const previousSlug = store.slug;
  const previousRubro = normalizeStoreRubro(store.rubro_tienda);
  const normalizedRubro = normalizeStoreRubro(rubroTienda);
  const enablePcBuilder = storeHasPCBuilder(normalizedRubro, input.enablePcBuilder);

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      name,
      slug,
      rubro_tienda: normalizedRubro,
      enable_pc_builder: enablePcBuilder,
      ...(input.logoUrl !== undefined
        ? { logo_url: input.logoUrl?.trim() || null }
        : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    })
    .eq("id", store.id);

  if (storeError) {
    if (storeError.code === "23505") {
      return { error: STORE_SLUG_UNAVAILABLE_MESSAGE };
    }
    return { error: storeError.message };
  }

  if (previousSlug !== slug) {
    scheduleStoreSubdomainRename(store.id, previousSlug, slug);
  }

  // Al cambiar (o reafirmar) el rubro, inyectar presets faltantes sin duplicar.
  const categorySync = await syncStoreProductCategories(
    supabase,
    store.id,
    normalizedRubro,
  );
  if (categorySync.error) {
    console.warn(
      JSON.stringify({
        scope: "settings-categories",
        event: "sync_failed",
        storeId: store.id,
        previousRubro,
        rubro: normalizedRubro,
        error: categorySync.error,
      }),
    );
  }

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/productos/nuevo");
  revalidatePublicStorePaths(slug);
  if (previousSlug !== slug) {
    revalidatePublicStorePaths(previousSlug);
  }

  return {
    success: true,
    rubroTienda: normalizedRubro,
  };
}
