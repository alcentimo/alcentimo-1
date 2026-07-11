import type { MetaProviderKey } from "@/src/config/channel-integrations";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface GraphErrorBody {
  error?: { message?: string; code?: number };
}

export interface MetaDiscoveredAssets {
  externalAccountId: string;
  displayName: string | null;
  config: Record<string, unknown>;
  /** Token recomendado para API calls (usuario o página según canal). */
  accessToken: string;
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as T & GraphErrorBody;

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? `Meta Graph API error (${response.status})`,
    );
  }

  return data;
}

/** Intercambia un token de corta duración por uno de larga duración (~60 días). */
export async function exchangeForLongLivedUserToken(
  shortLivedToken: string,
): Promise<string> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Meta app credentials not configured");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${GRAPH_BASE}/oauth/access_token?${params.toString()}`,
  );
  const data = (await response.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error?.message ?? "No se pudo obtener el token de larga duración",
    );
  }

  return data.access_token;
}

interface WhatsAppPhoneNumber {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
}

interface WhatsAppBusinessAccount {
  id?: string;
  name?: string;
  phone_numbers?: { data?: WhatsAppPhoneNumber[] };
}

interface BusinessNode {
  id?: string;
  name?: string;
  owned_whatsapp_business_accounts?: { data?: WhatsAppBusinessAccount[] };
}

async function discoverWhatsAppAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const response = await graphGet<{ data?: BusinessNode[] }>(
    "/me/businesses",
    accessToken,
    {
      fields:
        "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}",
    },
  );

  for (const business of response.data ?? []) {
    for (const waba of business.owned_whatsapp_business_accounts?.data ?? []) {
      const phone = waba.phone_numbers?.data?.[0];
      if (!phone?.id) continue;

      return {
        externalAccountId: phone.id,
        displayName:
          phone.verified_name ??
          phone.display_phone_number ??
          waba.name ??
          business.name ??
          null,
        config: {
          business_id: business.id,
          business_name: business.name,
          waba_id: waba.id,
          waba_name: waba.name,
          phone_number_id: phone.id,
          display_phone_number: phone.display_phone_number ?? null,
          verified_name: phone.verified_name ?? null,
        },
        accessToken,
      };
    }
  }

  return null;
}

interface PageAccount {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
  };
}

async function listManagedPages(accessToken: string): Promise<PageAccount[]> {
  const response = await graphGet<{ data?: PageAccount[] }>(
    "/me/accounts",
    accessToken,
    {
      fields: "id,name,access_token,instagram_business_account{id,username}",
    },
  );

  return response.data ?? [];
}

async function discoverMessengerAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const pages = await listManagedPages(accessToken);
  const page = pages[0];
  if (!page?.id) return null;

  return {
    externalAccountId: page.id,
    displayName: page.name ?? null,
    config: {
      page_id: page.id,
      page_name: page.name ?? null,
    },
    accessToken: page.access_token ?? accessToken,
  };
}

async function discoverInstagramAssets(
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  const pages = await listManagedPages(accessToken);

  for (const page of pages) {
    const igAccount = page.instagram_business_account;
    if (!igAccount?.id) continue;

    return {
      externalAccountId: igAccount.id,
      displayName: igAccount.username
        ? `@${igAccount.username}`
        : (page.name ?? null),
      config: {
        page_id: page.id,
        page_name: page.name ?? null,
        ig_user_id: igAccount.id,
        ig_username: igAccount.username ?? null,
      },
      accessToken: page.access_token ?? accessToken,
    };
  }

  return null;
}

/**
 * Descubre IDs de webhook (phone_number_id, page_id, ig_user_id) tras OAuth.
 */
export async function discoverMetaIntegrationAssets(
  provider: MetaProviderKey,
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  switch (provider) {
    case "whatsapp":
      return discoverWhatsAppAssets(accessToken);
    case "messenger":
      return discoverMessengerAssets(accessToken);
    case "instagram":
      return discoverInstagramAssets(accessToken);
    default:
      return null;
  }
}
