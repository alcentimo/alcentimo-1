import { authorizeProvisionRequest } from "./verify-provision-auth.ts";
import {
  runStoreSubdomainProvision,
  type StoreSubdomainAction,
  type StoreSubdomainRequest,
} from "./store-subdomain-run.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseAction(value: unknown): StoreSubdomainAction | null {
  if (value === "provision" || value === "deprovision" || value === "rename") {
    return value;
  }
  return null;
}

function parseRequestBody(body: unknown): StoreSubdomainRequest | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const action = parseAction(record.action);
  const storeId = typeof record.storeId === "string" ? record.storeId.trim() : "";
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  const previousSlug =
    typeof record.previousSlug === "string"
      ? record.previousSlug.trim()
      : undefined;

  if (!action || !storeId || !slug) return null;

  return { action, storeId, slug, previousSlug };
}

export async function serveStoreSubdomainProvision(
  request: Request,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const auth = authorizeProvisionRequest(request);
  if (!auth.authorized) {
    console.error(
      JSON.stringify({
        scope: "store-subdomain-provision",
        event: "edge_unauthorized",
        reason: auth.reason,
      }),
    );
    return jsonResponse(
      {
        error: "No autorizado.",
        detail: auth.reason,
      },
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const parsed = parseRequestBody(body);
  if (!parsed) {
    return jsonResponse(
      {
        error:
          "Payload inválido. Requiere action (provision|deprovision|rename), storeId y slug.",
      },
      400,
    );
  }

  if (parsed.action === "rename" && !parsed.previousSlug) {
    return jsonResponse(
      { error: "rename requiere previousSlug." },
      400,
    );
  }

  try {
    const result = await runStoreSubdomainProvision(parsed);
    const status = result.ok || result.skipped ? 200 : 502;
    return jsonResponse(result, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    console.error(
      JSON.stringify({
        scope: "store-subdomain-provision",
        event: "edge_exception",
        error: message,
      }),
    );
    return jsonResponse({ error: message }, 500);
  }
}
