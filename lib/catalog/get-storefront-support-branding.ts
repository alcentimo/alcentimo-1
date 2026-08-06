import type { Store } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StorefrontSupportBranding {
  storeName: string;
  /** Logo de tienda o foto del comerciante (prioridad: logo → foto dueño → icono PWA). */
  avatarUrl: string | null;
  /** Nombre del comerciante / dueño, si está configurado. */
  merchantName: string | null;
}

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveOwnerPublicProfile(ownerId: string): Promise<{
  merchantName: string | null;
  ownerAvatarUrl: string | null;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(ownerId);
    if (error || !data.user) {
      return { merchantName: null, ownerAvatarUrl: null };
    }

    const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const merchantNameRaw =
      readMetadataString(metadata, "display_name") ??
      readMetadataString(metadata, "full_name");
    const merchantName = merchantNameRaw
      ? (() => {
          const normalized = merchantNameRaw
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          if (
            normalized === "al centimo" ||
            normalized === "alcentimo" ||
            normalized.includes("al centimo") ||
            normalized.includes("alcentimo")
          ) {
            return null;
          }
          return merchantNameRaw;
        })()
      : null;
    const ownerAvatarUrl =
      readMetadataString(metadata, "picture") ??
      readMetadataString(metadata, "avatar_url");

    return { merchantName, ownerAvatarUrl };
  } catch {
    return { merchantName: null, ownerAvatarUrl: null };
  }
}

export async function getStorefrontSupportBranding(
  store: Store,
): Promise<StorefrontSupportBranding> {
  const storeName = store.name.trim();
  const { merchantName, ownerAvatarUrl } = await resolveOwnerPublicProfile(
    store.owner_id,
  );

  const avatarUrl =
    store.logo_url?.trim() ||
    ownerAvatarUrl ||
    store.pwa_icon_192_url?.trim() ||
    store.pwa_icon_512_url?.trim() ||
    null;

  return {
    storeName,
    avatarUrl,
    merchantName,
  };
}
