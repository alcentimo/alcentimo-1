"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import {
  DEFAULT_PLATFORM_SETTINGS,
  parsePlatformSettingsRow,
  PLATFORM_SETTINGS_ID,
  type PlatformSettings,
} from "@/lib/platform/platform-settings";
import {
  removePlatformLogoAsset,
  uploadPlatformLogoImage,
} from "@/lib/storage";

export type UpdatePlatformSettingsResult = {
  error?: string;
  success?: boolean;
  settings?: PlatformSettings;
};

function revalidatePlatformBranding() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/login");
  revalidatePath("/register");
  revalidatePath("/activar");
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

  const { data: existing, error: readError } = await admin
    .from("platform_settings")
    .select("logo_url")
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const { error } = await admin.from("platform_settings").upsert(
    {
      id: PLATFORM_SETTINGS_ID,
      platform_name: platformName,
      tagline,
      support_email: supportEmail,
      logo_url: existing?.logo_url ?? null,
      updated_at: now,
      updated_by: auth.user.id,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePlatformBranding();

  return {
    success: true,
    settings: {
      platformName,
      tagline,
      logoUrl: existing?.logo_url ?? null,
      supportEmail,
    },
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
  const { data: existing, error: readError } = await admin
    .from("platform_settings")
    .select("platform_name, tagline, support_email")
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const parsed = parsePlatformSettingsRow(
    existing
      ? {
          id: PLATFORM_SETTINGS_ID,
          platform_name: existing.platform_name,
          tagline: existing.tagline,
          logo_url: upload.url,
          support_email: existing.support_email,
          updated_at: now,
          updated_by: auth.user.id,
        }
      : undefined,
  );

  const { error: updateError } = await admin.from("platform_settings").upsert(
    {
      id: PLATFORM_SETTINGS_ID,
      platform_name: parsed.platformName,
      tagline: parsed.tagline,
      support_email: parsed.supportEmail,
      logo_url: upload.url,
      updated_at: now,
      updated_by: auth.user.id,
    },
    { onConflict: "id" },
  );

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePlatformBranding();

  return {
    url: upload.url,
    settings: { ...parsed, logoUrl: upload.url },
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
  const { data: existing, error: readError } = await admin
    .from("platform_settings")
    .select("platform_name, tagline, support_email")
    .eq("id", PLATFORM_SETTINGS_ID)
    .maybeSingle();

  if (readError) {
    return { error: readError.message };
  }

  const parsed = parsePlatformSettingsRow(
    existing
      ? {
          id: PLATFORM_SETTINGS_ID,
          platform_name: existing.platform_name,
          tagline: existing.tagline,
          logo_url: null,
          support_email: existing.support_email,
          updated_at: now,
          updated_by: auth.user.id,
        }
      : undefined,
  );

  const { error } = await admin.from("platform_settings").upsert(
    {
      id: PLATFORM_SETTINGS_ID,
      platform_name: parsed.platformName,
      tagline: parsed.tagline,
      support_email: parsed.supportEmail,
      logo_url: null,
      updated_at: now,
      updated_by: auth.user.id,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePlatformBranding();

  return {
    success: true,
    settings: { ...parsed, logoUrl: null },
  };
}
