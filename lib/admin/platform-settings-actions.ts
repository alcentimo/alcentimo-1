"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { applyManualBcvRateToDatabase } from "@/lib/exchange-rate/sync-bcv-tasa";
import { roundExchangeRate } from "@/lib/format";
import {
  DEFAULT_PLATFORM_SETTINGS,
  parsePlatformSettingsRow,
  PLATFORM_SETTINGS_ID,
  type BcvRateMode,
  type PlatformSettings,
  type PlatformSettingsRow,
} from "@/lib/platform/platform-settings";
import { normalizeMarkupPercent } from "@/lib/dropship/settlement-math";
import { revalidateAllPublicCatalogCaches } from "@/lib/catalog/public-catalog-cache";
import {
  normalizePlatformDropshipShipping,
  validatePlatformDropshipShipping,
  type PlatformDropshipShippingSettings,
} from "@/lib/platform/dropship-shipping";
import {
  removePlatformLogoAsset,
  uploadPlatformLogoImage,
} from "@/lib/storage";

export type UpdatePlatformSettingsResult = {
  error?: string;
  success?: boolean;
  settings?: PlatformSettings;
};

const PLATFORM_SETTINGS_SELECT =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, dropship_platform_markup_percent, dropship_shipping, updated_at, updated_by";

const PLATFORM_SETTINGS_SELECT_MARKUP =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, dropship_platform_markup_percent, updated_at, updated_by";

const PLATFORM_SETTINGS_SELECT_BCV =
  "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, bcv_rate_mode, manual_bcv_rate, updated_at, updated_by";

function revalidatePlatformBranding() {
  revalidatePath("/", "layout");
  revalidatePath("/manifest.json");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/login");
  revalidatePath("/dashboard/planes");
  revalidatePath("/register");
  revalidatePath("/activar");
  revalidatePath("/onboarding");
}

function revalidateExchangeRateSurfaces() {
  revalidatePlatformBranding();
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/c", "layout");
  revalidatePath("/tienda", "layout");
  revalidateAllPublicCatalogCaches();
}

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso para editar la configuración de la plataforma." as const };
  }

  return { user };
}

function parseEmail(value: FormDataEntryValue | null): string | null {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return null;
  }
  return trimmed.slice(0, 120);
}

async function loadPlatformSettingsRow(
  admin: ReturnType<typeof createAdminClient>,
): Promise<PlatformSettingsRow | null> {
  const { data, error } = await admin
    .from("platform_settings")
    .select(PLATFORM_SETTINGS_SELECT)
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (!error && data) {
    return data as PlatformSettingsRow;
  }

  const { data: markupOnly, error: markupError } = await admin
    .from("platform_settings")
    .select(PLATFORM_SETTINGS_SELECT_MARKUP)
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (!markupError && markupOnly) {
    return markupOnly as PlatformSettingsRow;
  }

  const { data: bcvOnly, error: bcvError } = await admin
    .from("platform_settings")
    .select(PLATFORM_SETTINGS_SELECT_BCV)
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (!bcvError && bcvOnly) {
    return bcvOnly as PlatformSettingsRow;
  }

  const { data: legacy } = await admin
    .from("platform_settings")
    .select(
      "id, platform_name, tagline, logo_url, pwa_icon_192_url, pwa_icon_512_url, support_email, plans_coupon_box_enabled, updated_at, updated_by",
    )
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  return (legacy as PlatformSettingsRow | null) ?? null;
}

function toUpsertPayload(
  settings: PlatformSettings,
  updatedBy: string,
  updatedAt: string,
) {
  return {
    id: PLATFORM_SETTINGS_ID,
    platform_name: settings.platformName,
    tagline: settings.tagline,
    support_email: settings.supportEmail,
    logo_url: settings.logoUrl,
    pwa_icon_192_url: settings.pwaIcon192Url,
    pwa_icon_512_url: settings.pwaIcon512Url,
    plans_coupon_box_enabled: settings.plansCouponBoxEnabled,
    bcv_rate_mode: settings.bcvRateMode,
    manual_bcv_rate: settings.manualBcvRate,
    dropship_platform_markup_percent: settings.dropshipPlatformMarkupPercent,
    dropship_shipping: settings.dropshipShipping,
    updated_at: updatedAt,
    updated_by: updatedBy,
  };
}

async function upsertPlatformSettingsRow(
  admin: ReturnType<typeof createAdminClient>,
  payload: ReturnType<typeof toUpsertPayload>,
): Promise<string | null> {
  const { error } = await admin
    .from("platform_settings")
    .upsert(payload, { onConflict: "id" });

  if (!error) return null;

  if (
    error.message.includes("dropship_shipping") ||
    error.code === "42703"
  ) {
    const { dropship_shipping: _ignored, ...withoutShipping } = payload;
    const retry = await admin
      .from("platform_settings")
      .upsert(withoutShipping, { onConflict: "id" });
    if (!retry.error) return null;
    return retry.error.message;
  }

  return error.message;
}

function revalidateDropshipShippingSurfaces() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/c", "layout");
  revalidatePath("/tienda", "layout");
  revalidateAllPublicCatalogCaches();
}

export async function updatePlatformSettings(
  formData: FormData,
): Promise<UpdatePlatformSettingsResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const platformNameRaw = formData.get("platformName");
  const taglineRaw = formData.get("tagline");
  const supportEmailRaw = formData.get("supportEmail");

  const platformName =
    typeof platformNameRaw === "string" && platformNameRaw.trim()
      ? platformNameRaw.trim().slice(0, 60)
      : DEFAULT_PLATFORM_SETTINGS.platformName;

  const tagline =
    typeof taglineRaw === "string" && taglineRaw.trim()
      ? taglineRaw.trim().slice(0, 160)
      : DEFAULT_PLATFORM_SETTINGS.tagline;

  const supportEmail = parseEmail(supportEmailRaw);
  if (
    typeof supportEmailRaw === "string" &&
    supportEmailRaw.trim() &&
    !supportEmail
  ) {
    return { error: "El correo de soporte no es válido." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const current = parsePlatformSettingsRow(existing);

  const markupRaw = formData.get("dropshipPlatformMarkupPercent");
  const dropshipPlatformMarkupPercent =
    markupRaw == null || String(markupRaw).trim() === ""
      ? current.dropshipPlatformMarkupPercent
      : normalizeMarkupPercent(markupRaw);

  const next: PlatformSettings = {
    ...current,
    platformName,
    tagline,
    supportEmail,
    dropshipPlatformMarkupPercent,
  };

  const upsertError = await upsertPlatformSettingsRow(
    admin,
    toUpsertPayload(next, auth.user.id, now),
  );

  if (upsertError) {
    return { error: upsertError };
  }

  revalidatePlatformBranding();

  return {
    success: true,
    settings: next,
  };
}

export async function updatePlansCouponBoxEnabled(
  enabled: boolean,
): Promise<UpdatePlatformSettingsResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const next: PlatformSettings = {
    ...parsePlatformSettingsRow(existing),
    plansCouponBoxEnabled: enabled,
  };

  const upsertError = await upsertPlatformSettingsRow(
    admin,
    toUpsertPayload(next, auth.user.id, now),
  );

  if (upsertError) {
    return { error: upsertError };
  }

  revalidatePlatformBranding();

  return {
    success: true,
    settings: next,
  };
}

/**
 * Activa tasa automática (API) o manual de contingencia.
 * En modo manual exige una tasa > 0 y la publica en exchange_rate / tasas_cambio.
 */
export async function updateBcvRateSettings(input: {
  mode: BcvRateMode;
  manualRate?: number | null;
}): Promise<UpdatePlatformSettingsResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const mode: BcvRateMode = input.mode === "manual" ? "manual" : "automatic";
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const current = parsePlatformSettingsRow(existing);

  let manualBcvRate = current.manualBcvRate;
  if (input.manualRate !== undefined) {
    if (input.manualRate == null) {
      manualBcvRate = null;
    } else {
      const parsed = Number(input.manualRate);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { error: "Ingresa una tasa válida mayor que 0." };
      }
      if (parsed > 1_000_000) {
        return { error: "La tasa manual es demasiado alta." };
      }
      manualBcvRate = roundExchangeRate(parsed);
    }
  }

  if (mode === "manual") {
    if (manualBcvRate == null || manualBcvRate <= 0) {
      return {
        error: "Para usar tasa manual debes ingresar un valor mayor que 0.",
      };
    }

    const applied = await applyManualBcvRateToDatabase(admin, manualBcvRate);
    if (!applied.success) {
      return { error: applied.error ?? "No se pudo publicar la tasa manual." };
    }
  }

  const next: PlatformSettings = {
    ...current,
    bcvRateMode: mode,
    manualBcvRate,
  };

  const upsertError = await upsertPlatformSettingsRow(
    admin,
    toUpsertPayload(next, auth.user.id, now),
  );

  if (upsertError) {
    return { error: upsertError };
  }

  revalidateExchangeRateSurfaces();

  return {
    success: true,
    settings: next,
  };
}

export async function uploadPlatformLogo(
  formData: FormData,
): Promise<{ url?: string; error?: string; settings?: PlatformSettings }> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen para el logo." };
  }

  const admin = createAdminClient();
  const upload = await uploadPlatformLogoImage(admin, file);
  if (upload.error || !upload.url) {
    return { error: upload.error ?? "No se pudo subir el logo." };
  }

  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const next: PlatformSettings = {
    ...parsePlatformSettingsRow(existing),
    logoUrl: upload.url,
    pwaIcon192Url: upload.pwaIcon192Url ?? null,
    pwaIcon512Url: upload.pwaIcon512Url ?? null,
  };

  const upsertError = await upsertPlatformSettingsRow(
    admin,
    toUpsertPayload(next, auth.user.id, now),
  );

  if (upsertError) {
    return { error: upsertError };
  }

  revalidatePlatformBranding();

  return {
    url: upload.url,
    settings: next,
  };
}

export async function clearPlatformLogo(): Promise<UpdatePlatformSettingsResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const admin = createAdminClient();

  try {
    await removePlatformLogoAsset(admin);
  } catch {
    // Si falla el borrado en storage, igual limpiamos la URL en BD.
  }

  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const next: PlatformSettings = {
    ...parsePlatformSettingsRow(existing),
    logoUrl: null,
    pwaIcon192Url: null,
    pwaIcon512Url: null,
  };

  const upsertError = await upsertPlatformSettingsRow(
    admin,
    toUpsertPayload(next, auth.user.id, now),
  );

  if (upsertError) {
    return { error: upsertError };
  }

  revalidatePlatformBranding();

  return {
    success: true,
    settings: next,
  };
}

export async function updateDropshipShippingSettings(
  input: PlatformDropshipShippingSettings,
): Promise<UpdatePlatformSettingsResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth;

  const nextShipping = normalizePlatformDropshipShipping({
    ...input,
    pricingMode: "cod",
  });
  const validationError = validatePlatformDropshipShipping(nextShipping);
  if (validationError) {
    return { error: validationError };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const existing = await loadPlatformSettingsRow(admin);
  const next: PlatformSettings = {
    ...parsePlatformSettingsRow(existing),
    dropshipShipping: nextShipping,
  };

  const { error } = await admin
    .from("platform_settings")
    .upsert(toUpsertPayload(next, auth.user.id, now), { onConflict: "id" });

  if (error) {
    if (error.message.includes("dropship_shipping") || error.code === "42703") {
      return {
        error:
          "No se pudo guardar: falta aplicar la migración de envíos globales.",
      };
    }
    return { error: error.message };
  }

  revalidateDropshipShippingSurfaces();

  return {
    success: true,
    settings: next,
  };
}
