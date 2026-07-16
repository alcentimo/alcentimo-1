import type { MetaDiscoveredAssets } from "@/lib/inbox/meta-graph-api";
import type { MetaProviderKey } from "@/src/config/channel-integrations";

type AdminClient = ReturnType<
  typeof import("@/lib/supabase/admin").createAdminClient
>;

export interface PersistedChannelIntegration {
  id: string;
  store_id: string;
  provider: MetaProviderKey;
  external_account_id: string;
}

/** Usa phone_number_id como external_account_id cuando esté disponible. */
export function normalizeMetaIntegrationAssets(
  assets: MetaDiscoveredAssets,
): MetaDiscoveredAssets {
  const phoneNumberId =
    typeof assets.config.phone_number_id === "string"
      ? assets.config.phone_number_id.trim()
      : null;

  if (!phoneNumberId) {
    return assets;
  }

  return {
    ...assets,
    externalAccountId: phoneNumberId,
    config: {
      ...assets.config,
      phone_number_id: phoneNumberId,
      linked_via: assets.config.linked_via ?? "whatsapp",
    },
  };
}

export async function upsertChannelIntegration(
  admin: AdminClient,
  input: {
    storeId: string;
    provider: MetaProviderKey;
    assets: MetaDiscoveredAssets;
    displayNameFallback: string;
  },
): Promise<PersistedChannelIntegration> {
  const assets = normalizeMetaIntegrationAssets(input.assets);
  const externalAccountId = assets.externalAccountId;

  const integrationPatch = {
    external_account_id: externalAccountId,
    display_name: assets.displayName ?? input.displayNameFallback,
    config: assets.config,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data: existingByExternal } = await admin
    .from("channel_integrations")
    .select("id, store_id, provider, external_account_id")
    .eq("store_id", input.storeId)
    .eq("provider", input.provider)
    .eq("external_account_id", externalAccountId)
    .maybeSingle();

  let integrationId = existingByExternal?.id;

  if (!integrationId) {
    const { data: existingByProvider } = await admin
      .from("channel_integrations")
      .select("id, store_id, provider, external_account_id")
      .eq("store_id", input.storeId)
      .eq("provider", input.provider)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    integrationId = existingByProvider?.id;
  }

  if (integrationId) {
    const { error: updateError } = await admin
      .from("channel_integrations")
      .update(integrationPatch)
      .eq("id", integrationId);

    if (updateError) {
      throw updateError;
    }
  } else {
    const { data: created, error: createError } = await admin
      .from("channel_integrations")
      .insert({
        store_id: input.storeId,
        provider: input.provider,
        ...integrationPatch,
      })
      .select("id, store_id, provider, external_account_id")
      .single();

    if (createError || !created) {
      throw createError ?? new Error("Failed to create channel integration");
    }

    return created as PersistedChannelIntegration;
  }

  return {
    id: integrationId,
    store_id: input.storeId,
    provider: input.provider,
    external_account_id: externalAccountId,
  };
}

export async function upsertChannelIntegrationSecret(
  admin: AdminClient,
  integrationId: string,
  accessToken: string,
): Promise<void> {
  const { error } = await admin.from("channel_integration_secrets").upsert(
    {
      integration_id: integrationId,
      access_token: accessToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "integration_id" },
  );

  if (error) {
    throw error;
  }
}
