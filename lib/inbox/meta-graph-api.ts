import type { MetaProviderKey } from "@/src/config/channel-integrations";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface GraphErrorBody {
  error?: { message?: string; code?: number; type?: string };
}

export interface MetaDiscoveredAssets {
  externalAccountId: string;
  displayName: string | null;
  config: Record<string, unknown>;
  /** Token recomendado para API calls (usuario o página según canal). */
  accessToken: string;
}

interface GraphFetchResult<T> {
  ok: boolean;
  status: number;
  data: T & GraphErrorBody;
  path: string;
}

async function graphGetSafe<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<GraphFetchResult<T>> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = (await response.json()) as T & GraphErrorBody;

  return {
    ok: response.ok,
    status: response.status,
    data,
    path,
  };
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
  const result = await graphGetSafe<{ data?: BusinessNode[] }>(
    "/me/businesses",
    accessToken,
    {
      fields:
        "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}",
    },
  );

  if (!result.ok) {
    console.warn("[meta/discovery] WhatsApp lookup skipped", {
      status: result.status,
      error: result.data.error ?? null,
    });
    return null;
  }

  for (const business of result.data.data ?? []) {
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
          linked_via: "whatsapp",
        },
        accessToken,
      };
    }
  }

  return null;
}

/** Descubre activos de WhatsApp Business tras OAuth. */
export async function discoverMetaIntegrationAssets(
  provider: MetaProviderKey,
  accessToken: string,
): Promise<MetaDiscoveredAssets | null> {
  console.log("[meta/discovery] Starting asset discovery", { provider });

  if (provider !== "whatsapp") {
    console.warn("[meta/discovery] Provider no soportado:", provider);
    return null;
  }

  const assets = await discoverWhatsAppAssets(accessToken);

  if (assets) {
    console.log("[meta/discovery] WhatsApp asset accepted", {
      externalAccountId: assets.externalAccountId,
      displayName: assets.displayName,
    });
    return assets;
  }

  console.warn("[meta/discovery] No WhatsApp assets found");
  return null;
}
