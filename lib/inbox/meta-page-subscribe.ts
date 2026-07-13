const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Campos de webhook a nivel de Página (Messenger). */
export const META_PAGE_WEBHOOK_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
] as const;

export interface MetaGraphApiErrorDetails {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

export interface MetaPageSubscribeResult {
  pageId: string;
  subscribedFields: string[];
  success: boolean;
  httpStatus?: number;
  requestPath: string;
  tokenPreview?: string;
  tokenType?: string;
  tokenScopes?: string[];
  raw?: unknown;
  error?: string;
  graphError?: MetaGraphApiErrorDetails;
}

function previewToken(token: string): string {
  if (!token) return "(vacío)";
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

function extractGraphError(raw: unknown): MetaGraphApiErrorDetails | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as { error?: MetaGraphApiErrorDetails };
  return record.error;
}

function formatGraphError(error?: MetaGraphApiErrorDetails): string | undefined {
  if (!error) return undefined;

  const parts = [
    error.message,
    error.type ? `type=${error.type}` : null,
    error.code != null ? `code=${error.code}` : null,
    error.error_subcode != null ? `subcode=${error.error_subcode}` : null,
    error.fbtrace_id ? `fbtrace_id=${error.fbtrace_id}` : null,
    error.error_user_title ? `title=${error.error_user_title}` : null,
    error.error_user_msg ? `user_msg=${error.error_user_msg}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

/** Vercel a menudo no muestra objetos anidados; serializamos cada campo en su propia línea. */
function logPageSubscribeFailure(details: {
  reason: string;
  pageId: string;
  requestPath?: string;
  httpStatus?: number;
  subscribedFields?: string[];
  tokenPreview?: string;
  tokenType?: string;
  tokenScopes?: string[];
  graphError?: MetaGraphApiErrorDetails;
  formattedError?: string;
  rawResponse?: unknown;
  tokenDebug?: unknown;
  message?: string;
  stack?: string;
}): void {
  console.error("[meta/page-subscribe] Falló suscripción de página");
  console.error(`[meta/page-subscribe] reason=${details.reason}`);
  console.error(`[meta/page-subscribe] pageId=${details.pageId}`);
  if (details.requestPath) {
    console.error(`[meta/page-subscribe] requestPath=${details.requestPath}`);
  }
  if (details.httpStatus != null) {
    console.error(`[meta/page-subscribe] httpStatus=${details.httpStatus}`);
  }
  if (details.subscribedFields?.length) {
    console.error(
      `[meta/page-subscribe] subscribedFields=${JSON.stringify(details.subscribedFields)}`,
    );
  }
  if (details.tokenPreview) {
    console.error(`[meta/page-subscribe] tokenPreview=${details.tokenPreview}`);
  }
  console.error(
    `[meta/page-subscribe] tokenType=${details.tokenType ?? "(desconocido)"}`,
  );
  console.error(
    `[meta/page-subscribe] tokenScopes=${JSON.stringify(details.tokenScopes ?? [])}`,
  );
  if (details.formattedError) {
    console.error(`[meta/page-subscribe] formattedError=${details.formattedError}`);
  }
  if (details.graphError) {
    console.error(
      `[meta/page-subscribe] graphError=${JSON.stringify(details.graphError)}`,
    );
  }
  console.error(
    `[meta/page-subscribe] rawResponse=${JSON.stringify(details.rawResponse ?? null)}`,
  );
  if (details.tokenDebug !== undefined) {
    console.error(
      `[meta/page-subscribe] tokenDebug=${JSON.stringify(details.tokenDebug)}`,
    );
  }
  if (details.message) {
    console.error(`[meta/page-subscribe] exception=${details.message}`);
  }
  if (details.stack) {
    console.error(`[meta/page-subscribe] stack=${details.stack}`);
  }
}

async function debugMetaAccessToken(
  accessToken: string,
): Promise<{
  tokenPreview: string;
  type?: string;
  scopes?: string[];
  raw?: unknown;
  error?: string;
}> {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return {
      tokenPreview: previewToken(accessToken),
      error: "META_APP_ID / META_APP_SECRET no configurados para debug_token",
    };
  }

  try {
    const url = new URL(`${GRAPH_BASE}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", `${appId}|${appSecret}`);

    const response = await fetch(url.toString());
    const raw = (await response.json()) as {
      data?: {
        type?: string;
        scopes?: string[];
        app_id?: string;
        is_valid?: boolean;
        profile_id?: string;
      };
      error?: MetaGraphApiErrorDetails;
    };

    if (!response.ok || raw.error) {
      return {
        tokenPreview: previewToken(accessToken),
        raw,
        error: formatGraphError(raw.error) ?? `debug_token HTTP ${response.status}`,
      };
    }

    return {
      tokenPreview: previewToken(accessToken),
      type: raw.data?.type,
      scopes: raw.data?.scopes,
      raw: raw.data,
    };
  } catch (err) {
    return {
      tokenPreview: previewToken(accessToken),
      error: err instanceof Error ? err.message : "debug_token failed",
    };
  }
}

/**
 * Suscribe la página a webhooks de la app (POST /{page-id}/subscribed_apps).
 * Requiere page access token con pages_manage_metadata (y permisos de mensajería).
 */
export async function subscribeMetaPageWebhooks(
  pageId: string,
  pageAccessToken: string,
  fields: readonly string[] = META_PAGE_WEBHOOK_FIELDS,
): Promise<MetaPageSubscribeResult> {
  const subscribedFields = [
    ...new Set(fields.map((field) => field.trim()).filter(Boolean)),
  ];
  const requestPath = `/${pageId}/subscribed_apps`;

  const baseResult: MetaPageSubscribeResult = {
    pageId,
    subscribedFields,
    success: false,
    requestPath,
    tokenPreview: previewToken(pageAccessToken),
  };

  if (!pageId?.trim()) {
    const error = "pageId vacío — no se puede suscribir la página";
    logPageSubscribeFailure({
      reason: "validation",
      pageId: pageId || "(vacío)",
      requestPath,
      subscribedFields,
      formattedError: error,
    });
    return { ...baseResult, error };
  }

  if (!pageAccessToken?.trim()) {
    const error =
      "Page Access Token vacío — OAuth debe devolver access_token de la página, no solo token de usuario";
    logPageSubscribeFailure({
      reason: "validation",
      pageId,
      requestPath,
      subscribedFields,
      formattedError: error,
    });
    return { ...baseResult, error };
  }

  try {
    const url = new URL(`${GRAPH_BASE}${requestPath}`);
    url.searchParams.set("subscribed_fields", subscribedFields.join(","));
    url.searchParams.set("access_token", pageAccessToken);

    console.log("[meta/page-subscribe] Enviando suscripción de página", {
      pageId,
      requestPath,
      subscribedFields,
      tokenPreview: previewToken(pageAccessToken),
      graphVersion: GRAPH_API_VERSION,
    });

    const response = await fetch(url.toString(), { method: "POST" });
    const responseText = await response.text();

    let raw: unknown;
    try {
      raw = responseText ? JSON.parse(responseText) : {};
    } catch {
      raw = { parseError: true, bodyPreview: responseText.slice(0, 500) };
    }

    const graphError = extractGraphError(raw);
    const success =
      response.ok &&
      typeof raw === "object" &&
      raw !== null &&
      (raw as { success?: boolean }).success === true;

    const tokenDebug = await debugMetaAccessToken(pageAccessToken);

    const result: MetaPageSubscribeResult = {
      ...baseResult,
      httpStatus: response.status,
      success,
      raw,
      graphError,
      error: success
        ? undefined
        : formatGraphError(graphError) ??
          `HTTP ${response.status} en POST ${requestPath}`,
      tokenType: tokenDebug.type,
      tokenScopes: tokenDebug.scopes,
    };

    if (success) {
      console.log("[meta/page-subscribe] Página suscrita a webhooks", {
        pageId: result.pageId,
        subscribedFields: result.subscribedFields,
        httpStatus: result.httpStatus,
        tokenType: result.tokenType,
        tokenScopes: result.tokenScopes,
      });
      return result;
    }

    logPageSubscribeFailure({
      reason: "graph_api",
      pageId: result.pageId,
      requestPath: result.requestPath,
      httpStatus: result.httpStatus,
      subscribedFields: result.subscribedFields,
      tokenPreview: result.tokenPreview,
      tokenType: result.tokenType,
      tokenScopes: result.tokenScopes,
      graphError: result.graphError,
      formattedError: result.error,
      rawResponse: raw,
      tokenDebug: tokenDebug.raw ?? tokenDebug.error,
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown subscribe error";
    const tokenDebug = await debugMetaAccessToken(pageAccessToken);

    logPageSubscribeFailure({
      reason: "exception",
      pageId,
      requestPath,
      subscribedFields,
      tokenPreview: previewToken(pageAccessToken),
      tokenType: tokenDebug.type,
      tokenScopes: tokenDebug.scopes,
      message,
      stack: err instanceof Error ? err.stack : undefined,
      tokenDebug: tokenDebug.raw ?? tokenDebug.error,
    });

    return {
      ...baseResult,
      error: message,
      tokenType: tokenDebug.type,
      tokenScopes: tokenDebug.scopes,
    };
  }
}
