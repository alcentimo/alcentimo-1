/**
 * Cliente del lado Vercel/Next.js para invocar la Edge Function de Supabase.
 * La lógica de Cloudflare/Vercel vive en supabase/functions/provision-store-subdomain.
 */

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Activa la invocación de la Edge Function al crear o renombrar tiendas. */
export function isStoreSubdomainProvisioningEnabled(): boolean {
  if (process.env.STORE_SUBDOMAIN_PROVISION_ENABLED === "true") return true;
  if (process.env.STORE_SUBDOMAIN_PROVISION_ENABLED === "false") return false;
  return process.env.NODE_ENV === "production";
}

function getProvisionFunctionUrl(): string | null {
  const supabaseUrl = optionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseUrl) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/provision-store-subdomain`;
}

export interface ProvisionStoreSubdomainInput {
  storeId: string;
  slug: string;
}

type ProvisionAction = "provision" | "deprovision" | "rename";

interface InvokePayload {
  action: ProvisionAction;
  storeId: string;
  slug: string;
  previousSlug?: string;
}

function logProvision(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      scope: "store-subdomain-provision",
      event,
      ...payload,
    }),
  );
}

async function invokeProvisionEdgeFunction(
  payload: InvokePayload,
): Promise<void> {
  if (!isStoreSubdomainProvisioningEnabled()) {
    return;
  }

  const functionUrl = getProvisionFunctionUrl();
  const serviceRoleKey = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!functionUrl || !serviceRoleKey) {
    logProvision("invoke_skipped_missing_config", {
      hasFunctionUrl: Boolean(functionUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      ...payload,
    });
    return;
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; skipped?: boolean; error?: string }
    | null;

  if (!response.ok) {
    logProvision("edge_invoke_failed", {
      status: response.status,
      error: body?.error ?? "Edge Function error",
      ...payload,
    });
    return;
  }

  if (body?.error && !body.skipped) {
    logProvision("edge_provision_failed", {
      error: body.error,
      ...payload,
    });
    return;
  }

  logProvision("edge_invoke_success", { ...payload });
}

/** Fire-and-forget: no bloquea onboarding ni ajustes. */
export function scheduleStoreSubdomainProvision(
  input: ProvisionStoreSubdomainInput,
): void {
  void invokeProvisionEdgeFunction({
    action: "provision",
    storeId: input.storeId,
    slug: input.slug,
  }).catch((error: unknown) => {
    logProvision("unhandled_error", {
      storeId: input.storeId,
      slug: input.slug,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/** Aprovisiona el nuevo slug y limpia el anterior en una sola invocación. */
export function scheduleStoreSubdomainRename(
  storeId: string,
  previousSlug: string,
  nextSlug: string,
): void {
  if (previousSlug === nextSlug) return;

  void invokeProvisionEdgeFunction({
    action: "rename",
    storeId,
    slug: nextSlug,
    previousSlug,
  }).catch((error: unknown) => {
    logProvision("unhandled_error", {
      storeId,
      slug: nextSlug,
      previousSlug,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
