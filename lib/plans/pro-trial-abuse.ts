import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";

export type ProTrialContactGuardResult =
  | {
      ok: true;
      emailNormalized: string;
      phoneNormalized: string;
    }
  | { ok: false; error: string; reason: ProTrialContactGuardReason };

export type ProTrialContactGuardReason =
  | "store_already_claimed"
  | "contact_required"
  | "email_reused"
  | "phone_reused"
  | "email_missing";

function normalizeClaimEmail(email: string | null | undefined): string | null {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Valida anti-abuso antes de reclamar la prueba Pro:
 * - la tienda no debe haber reclamado antes
 * - WhatsApp principal obligatorio
 * - correo y teléfono no deben figurar en claims de otras tiendas
 */
export async function assertProTrialContactAvailable(options: {
  storeId: string;
  ownerEmail: string | null | undefined;
}): Promise<ProTrialContactGuardResult> {
  const admin = createAdminClient();

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, pro_trial_claimed_at")
    .eq("id", options.storeId)
    .maybeSingle();

  if (storeError) {
    return { ok: false, error: storeError.message, reason: "store_already_claimed" };
  }

  if (store?.pro_trial_claimed_at) {
    return {
      ok: false,
      error: "Esta tienda ya reclamó la prueba gratis del Plan Pro.",
      reason: "store_already_claimed",
    };
  }

  const emailNormalized = normalizeClaimEmail(options.ownerEmail);
  if (!emailNormalized) {
    return {
      ok: false,
      error: "Tu cuenta necesita un correo válido para reclamar la prueba Pro.",
      reason: "email_missing",
    };
  }

  const settings = await getStoreSettingsConfig(options.storeId);
  const phoneRaw =
    settings.contact.whatsappPhone.trim() ||
    settings.contact.whatsappPhones[0]?.trim() ||
    "";
  const phoneNormalized = normalizeWhatsAppPhone(phoneRaw);

  if (!phoneNormalized) {
    return {
      ok: false,
      error:
        "Configura el WhatsApp principal de tu tienda antes de reclamar la prueba Pro.",
      reason: "contact_required",
    };
  }

  const [{ data: emailHit }, { data: phoneHit }] = await Promise.all([
    admin
      .from("pro_trial_contact_claims")
      .select("store_id")
      .eq("contact_email_normalized", emailNormalized)
      .neq("store_id", options.storeId)
      .maybeSingle(),
    admin
      .from("pro_trial_contact_claims")
      .select("store_id")
      .eq("contact_phone_normalized", phoneNormalized)
      .neq("store_id", options.storeId)
      .maybeSingle(),
  ]);

  if (emailHit?.store_id) {
    return {
      ok: false,
      error:
        "Este correo de contacto ya se usó para reclamar la prueba Pro en otra tienda.",
      reason: "email_reused",
    };
  }

  if (phoneHit?.store_id) {
    return {
      ok: false,
      error:
        "Este número de teléfono ya se usó para reclamar la prueba Pro en otra tienda.",
      reason: "phone_reused",
    };
  }

  return {
    ok: true,
    emailNormalized,
    phoneNormalized,
  };
}

/** Persiste flag de tienda + huellas de contacto (fallback admin si el RPC no lo hace). */
export async function recordProTrialClaimArtifacts(options: {
  storeId: string;
  ownerUserId: string;
  emailNormalized: string;
  phoneNormalized: string;
  claimedAtIso: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { error: storeError } = await admin
    .from("stores")
    .update({ pro_trial_claimed_at: options.claimedAtIso })
    .eq("id", options.storeId)
    .is("pro_trial_claimed_at", null);

  if (storeError) {
    return { ok: false, error: storeError.message };
  }

  const { error: claimError } = await admin.from("pro_trial_contact_claims").upsert(
    {
      store_id: options.storeId,
      owner_user_id: options.ownerUserId,
      contact_email_normalized: options.emailNormalized,
      contact_phone_normalized: options.phoneNormalized,
      claimed_at: options.claimedAtIso,
    },
    { onConflict: "store_id", ignoreDuplicates: true },
  );

  if (claimError) {
    // Unique email/phone: race condition con otra tienda.
    if (
      claimError.code === "23505" ||
      claimError.message.toLowerCase().includes("unique")
    ) {
      return {
        ok: false,
        error:
          "Este correo o teléfono ya se usó para reclamar la prueba Pro en otra tienda.",
      };
    }
    return { ok: false, error: claimError.message };
  }

  return { ok: true };
}
