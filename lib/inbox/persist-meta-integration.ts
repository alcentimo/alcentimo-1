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

const NUMERIC_PAGE_ID = /^\d+$/;

export function isNumericMetaPageId(value: string | null | undefined): value is string {
  return Boolean(value && NUMERIC_PAGE_ID.test(value));
}

/** Usa el Page ID numérico de Meta como external_account_id cuando esté disponible. */
export function normalizeMetaIntegrationAssets(
  assets: MetaDiscoveredAssets,
): MetaDiscoveredAssets {
  const configPageId =
    typeof assets.config.page_id === "string" ? assets.config.page_id.trim() : null;

  const externalId = assets.externalAccountId.trim();
  const resolvedPageId = isNumericMetaPageId(configPageId)
    ? configPageId
    : isNumericMetaPageId(externalId)
      ? externalId
      : null;

  if (!resolvedPageId) {
    return assets;
  }

  return {
    ...assets,
    externalAccountId: resolvedPageId,
    config: {
      ...assets.config,
      page_id: resolvedPageId,
      linked_via: assets.config.linked_via ?? "facebook_page",
    },
  };
}

export function getMessengerPageIdFromAssets(
  assets: MetaDiscoveredAssets,
): string | null {
  const normalized = normalizeMetaIntegrationAssets(assets);
  const pageId =
    typeof normalized.config.page_id === "string"
      ? normalized.config.page_id
      : normalized.externalAccountId;

  return isNumericMetaPageId(pageId) ? pageId : null;
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

async function getSingleActiveStoreId(
  admin: AdminClient,
): Promise<string | null> {
  const { data: stores, error } = await admin
    .from("stores")
    .select("id")
    .eq("is_active", true)
    .limit(2);

  if (error || !stores || stores.length !== 1) {
    return null;
  }

  return stores[0].id;
}

/**
 * Busca integración messenger por Page ID. Repara external_account_id desactualizado
 * o crea la fila si hay una sola tienda activa en el sistema.
 */
export async function findOrRepairMessengerIntegration(
  admin: AdminClient,
  pageId: string,
): Promise<{ id: string; store_id: string } | null> {
  if (!isNumericMetaPageId(pageId)) return null;

  const { data: exactMatch, error: exactError } = await admin
    .from("channel_integrations")
    .select("id, store_id, external_account_id, is_active")
    .eq("provider", "messenger")
    .eq("external_account_id", pageId)
    .eq("is_active", true)
    .maybeSingle();

  if (exactError) {
    console.error("[meta/integration] exact lookup error:", exactError);
    return null;
  }

  if (exactMatch) {
    return { id: exactMatch.id, store_id: exactMatch.store_id };
  }

  const { data: configMatches, error: configError } = await admin
    .from("channel_integrations")
    .select("id, store_id, external_account_id, is_active")
    .eq("provider", "messenger")
    .filter("config->>page_id", "eq", pageId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (configError) {
    console.error("[meta/integration] config lookup error:", configError);
  } else if (configMatches?.[0]) {
    const row = configMatches[0];
    const { error: repairError } = await admin
      .from("channel_integrations")
      .update({
        external_account_id: pageId,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (repairError) {
      console.error("[meta/integration] repair by config failed:", repairError);
    } else {
      console.log("[meta/integration] Repaired messenger integration from config.page_id", {
        integrationId: row.id,
        previousExternalAccountId: row.external_account_id,
        pageId,
      });
      return { id: row.id, store_id: row.store_id };
    }
  }

  const { data: inactiveMatch } = await admin
    .from("channel_integrations")
    .select("id, store_id, external_account_id")
    .eq("provider", "messenger")
    .eq("external_account_id", pageId)
    .eq("is_active", false)
    .maybeSingle();

  if (inactiveMatch) {
    await admin
      .from("channel_integrations")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", inactiveMatch.id);

    console.log("[meta/integration] Reactivated inactive messenger integration", {
      integrationId: inactiveMatch.id,
      pageId,
    });

    return { id: inactiveMatch.id, store_id: inactiveMatch.store_id };
  }

  const storeId = await getSingleActiveStoreId(admin);
  if (!storeId) {
    return null;
  }

  const { data: created, error: createError } = await admin
    .from("channel_integrations")
    .insert({
      store_id: storeId,
      provider: "messenger",
      external_account_id: pageId,
      display_name: "Facebook Page",
      config: {
        page_id: pageId,
        linked_via: "facebook_page",
        auto_created_by_webhook: true,
      },
      is_active: true,
    })
    .select("id, store_id")
    .single();

  if (createError || !created) {
    console.error("[meta/integration] auto-create failed:", createError);
    return null;
  }

  console.warn("[meta/integration] Auto-created messenger integration from webhook", {
    integrationId: created.id,
    storeId: created.store_id,
    pageId,
  });

  return created;
}
