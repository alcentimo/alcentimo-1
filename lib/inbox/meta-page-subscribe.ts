const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Campos de webhook a nivel de Página (Messenger). */
export const META_PAGE_WEBHOOK_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
] as const;

export interface MetaPageSubscribeResult {
  pageId: string;
  subscribedFields: string[];
  success: boolean;
  raw?: unknown;
  error?: string;
}

/**
 * Suscribe la página a webhooks de la app (POST /{page-id}/subscribed_apps).
 * Requiere page access token con pages_manage_metadata.
 */
export async function subscribeMetaPageWebhooks(
  pageId: string,
  pageAccessToken: string,
  fields: readonly string[] = META_PAGE_WEBHOOK_FIELDS,
): Promise<MetaPageSubscribeResult> {
  const subscribedFields = [...new Set(fields.map((field) => field.trim()).filter(Boolean))];

  const url = new URL(`${GRAPH_BASE}/${pageId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", subscribedFields.join(","));
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url.toString(), { method: "POST" });
  const raw = (await response.json()) as {
    success?: boolean;
    error?: { message?: string };
  };

  const success = response.ok && raw.success === true;

  const result: MetaPageSubscribeResult = {
    pageId,
    subscribedFields,
    success,
    raw,
    error: success ? undefined : raw.error?.message ?? `HTTP ${response.status}`,
  };

  if (success) {
    console.log("[meta/page-subscribe] Página suscrita a webhooks", result);
  } else {
    console.error("[meta/page-subscribe] Falló suscripción de página", result);
  }

  return result;
}
