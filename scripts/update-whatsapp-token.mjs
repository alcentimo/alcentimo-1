/**
 * Sincroniza WHATSAPP_ACCESS_TOKEN desde .env.local hacia
 * channel_integration_secrets en Supabase.
 *
 * Uso:
 *   node scripts/update-whatsapp-token.mjs
 *
 * Requiere en .env.local (nunca commitear):
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   WHATSAPP_ACCESS_TOKEN
 *
 * Si aún no existe integración WhatsApp, también:
 *   WHATSAPP_STORE_ID=<uuid de stores>
 *   WHATSAPP_PHONE_NUMBER_ID=<id de Meta API Setup> (recomendado)
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readLocalEnv() {
  const env = {};
  if (!existsSync(".env.local")) return env;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) env[key] = value;
  }

  return env;
}

async function listStores(supabase) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

async function ensureWhatsAppIntegration(supabase, input) {
  const { data: existing, error: existingError } = await supabase
    .from("channel_integrations")
    .select("id, store_id, display_name, external_account_id")
    .eq("provider", "whatsapp")
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const externalAccountId = input.phoneNumberId?.trim() || "pending-whatsapp";
  const { data: created, error: createError } = await supabase
    .from("channel_integrations")
    .insert({
      store_id: input.storeId,
      provider: "whatsapp",
      external_account_id: externalAccountId,
      display_name: input.displayName ?? "WhatsApp",
      is_active: true,
      config: input.phoneNumberId
        ? {
            phone_number_id: input.phoneNumberId,
            display_phone_number: input.displayPhoneNumber ?? null,
          }
        : {},
    })
    .select("id, store_id, display_name, external_account_id")
    .single();

  if (createError || !created) {
    throw createError ?? new Error("No se pudo crear la integración WhatsApp.");
  }

  console.log(
    `[update-whatsapp-token] Integración WhatsApp creada (${created.id}, external_account_id=${created.external_account_id}).`,
  );

  return created;
}

async function main() {
  const local = readLocalEnv();
  const supabaseUrl =
    local.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    local.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken =
    local.WHATSAPP_ACCESS_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;
  const storeId = local.WHATSAPP_STORE_ID ?? process.env.WHATSAPP_STORE_ID;
  const phoneNumberId =
    local.WHATSAPP_PHONE_NUMBER_ID ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[update-whatsapp-token] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
    process.exit(1);
  }

  if (!accessToken?.trim()) {
    console.error(
      "[update-whatsapp-token] Falta WHATSAPP_ACCESS_TOKEN en .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let { data: integrations, error: listError } = await supabase
    .from("channel_integrations")
    .select("id, store_id, display_name, external_account_id")
    .eq("provider", "whatsapp")
    .eq("is_active", true);

  if (listError) {
    console.error(
      "[update-whatsapp-token] Error listando integraciones:",
      listError.message,
    );
    process.exit(1);
  }

  if (!integrations?.length) {
    if (!storeId?.trim()) {
      console.warn(
        "[update-whatsapp-token] No hay integración WhatsApp. Define WHATSAPP_STORE_ID en .env.local y vuelve a ejecutar.",
      );
      const stores = await listStores(supabase);
      for (const store of stores) {
        console.warn(`  - ${store.name} (${store.slug}): ${store.id}`);
      }
      process.exit(1);
    }

    const created = await ensureWhatsAppIntegration(supabase, {
      storeId: storeId.trim(),
      phoneNumberId,
      displayName: "WhatsApp",
    });
    integrations = [created];
  }

  for (const integration of integrations) {
    if (
      phoneNumberId?.trim() &&
      integration.external_account_id !== phoneNumberId.trim()
    ) {
      const { error: patchError } = await supabase
        .from("channel_integrations")
        .update({
          external_account_id: phoneNumberId.trim(),
          config: {
            phone_number_id: phoneNumberId.trim(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      if (patchError) {
        console.error(
          `[update-whatsapp-token] No se pudo actualizar phone_number_id:`,
          patchError.message,
        );
        process.exit(1);
      }

      console.log(
        `[update-whatsapp-token] phone_number_id actualizado a ${phoneNumberId.trim()}.`,
      );
    }

    const { error: upsertError } = await supabase
      .from("channel_integration_secrets")
      .upsert({
        integration_id: integration.id,
        access_token: accessToken.trim(),
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error(
        `[update-whatsapp-token] Error guardando token para ${integration.id}:`,
        upsertError.message,
      );
      process.exit(1);
    }

    console.log(
      `[update-whatsapp-token] Token guardado en channel_integration_secrets para integración ${integration.id} (${integration.display_name ?? "WhatsApp"}).`,
    );
  }

  console.log("[update-whatsapp-token] Listo. El token no se escribió en el repositorio.");
}

main().catch((error) => {
  console.error("[update-whatsapp-token] Error inesperado:", error);
  process.exit(1);
});
