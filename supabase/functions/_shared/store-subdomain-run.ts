import {
  getDomainProvisioningConfig,
  isStoreSubdomainProvisioningEnabled,
} from "./store-subdomain-config.ts";
import {
  ensureCloudflareStoreCname,
  removeCloudflareStoreCname,
} from "./store-subdomain-cloudflare.ts";
import {
  ensureVercelProjectDomain,
  removeVercelProjectDomain,
} from "./store-subdomain-vercel.ts";

const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type StoreSubdomainAction = "provision" | "deprovision" | "rename";

export interface StoreSubdomainRequest {
  action: StoreSubdomainAction;
  storeId: string;
  slug: string;
  previousSlug?: string;
}

export interface StoreSubdomainResult {
  ok: boolean;
  skipped: boolean;
  action: StoreSubdomainAction;
  slug: string;
  storeId: string;
  cloudflare?: { created?: boolean; removed?: boolean };
  vercel?: { created?: boolean; removed?: boolean };
  error?: string;
}

function isValidStoreSlug(slug: string): boolean {
  return STORE_SLUG_PATTERN.test(slug.trim());
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

async function provisionSlug(
  storeId: string,
  slug: string,
): Promise<StoreSubdomainResult> {
  const config = getDomainProvisioningConfig();
  if (!config) {
    logProvision("missing_config", { storeId, slug });
    return {
      ok: false,
      skipped: true,
      action: "provision",
      slug,
      storeId,
      error:
        "STORE_SUBDOMAIN_PROVISION_ENABLED=true pero faltan credenciales en Supabase secrets.",
    };
  }

  const cloudflare = await ensureCloudflareStoreCname(config, slug);
  if (!cloudflare.ok) {
    logProvision("cloudflare_failed", { storeId, slug, error: cloudflare.error });
    return {
      ok: false,
      skipped: false,
      action: "provision",
      slug,
      storeId,
      error: cloudflare.error,
    };
  }

  const vercel = await ensureVercelProjectDomain(config, slug);
  if (!vercel.ok) {
    logProvision("vercel_failed", { storeId, slug, error: vercel.error });
    return {
      ok: false,
      skipped: false,
      action: "provision",
      slug,
      storeId,
      error: vercel.error,
    };
  }

  logProvision("success", {
    storeId,
    slug,
    cloudflareCreated: cloudflare.created,
    vercelCreated: vercel.created,
  });

  return {
    ok: true,
    skipped: false,
    action: "provision",
    slug,
    storeId,
    cloudflare: { created: cloudflare.created },
    vercel: { created: vercel.created },
  };
}

async function deprovisionSlug(
  storeId: string,
  slug: string,
): Promise<StoreSubdomainResult> {
  const config = getDomainProvisioningConfig();
  if (!config) {
    return {
      ok: true,
      skipped: true,
      action: "deprovision",
      slug,
      storeId,
    };
  }

  const cloudflare = await removeCloudflareStoreCname(config, slug);
  if (!cloudflare.ok) {
    return {
      ok: false,
      skipped: false,
      action: "deprovision",
      slug,
      storeId,
      error: cloudflare.error,
    };
  }

  const vercel = await removeVercelProjectDomain(config, slug);
  if (!vercel.ok) {
    return {
      ok: false,
      skipped: false,
      action: "deprovision",
      slug,
      storeId,
      error: vercel.error,
    };
  }

  return {
    ok: true,
    skipped: false,
    action: "deprovision",
    slug,
    storeId,
    cloudflare: { removed: cloudflare.removed },
    vercel: { removed: vercel.removed },
  };
}

export async function runStoreSubdomainProvision(
  input: StoreSubdomainRequest,
): Promise<StoreSubdomainResult> {
  const slug = input.slug.trim().toLowerCase();
  const previousSlug = input.previousSlug?.trim().toLowerCase();

  if (!isValidStoreSlug(slug)) {
    return {
      ok: false,
      skipped: true,
      action: input.action,
      slug,
      storeId: input.storeId,
      error: "Slug inválido para subdominio.",
    };
  }

  if (!isStoreSubdomainProvisioningEnabled()) {
    return {
      ok: true,
      skipped: true,
      action: input.action,
      slug,
      storeId: input.storeId,
    };
  }

  if (input.action === "provision") {
    return provisionSlug(input.storeId, slug);
  }

  if (input.action === "deprovision") {
    return deprovisionSlug(input.storeId, slug);
  }

  const provisionResult = await provisionSlug(input.storeId, slug);
  if (!provisionResult.ok && !provisionResult.skipped) {
    return {
      ...provisionResult,
      action: "rename",
    };
  }

  if (previousSlug && previousSlug !== slug && isValidStoreSlug(previousSlug)) {
    const deprovisionResult = await deprovisionSlug(input.storeId, previousSlug);
    if (!deprovisionResult.ok && !deprovisionResult.skipped) {
      return {
        ok: false,
        skipped: false,
        action: "rename",
        slug,
        storeId: input.storeId,
        error: deprovisionResult.error,
        cloudflare: provisionResult.cloudflare,
        vercel: provisionResult.vercel,
      };
    }
  }

  return {
    ok: true,
    skipped: false,
    action: "rename",
    slug,
    storeId: input.storeId,
    cloudflare: provisionResult.cloudflare,
    vercel: provisionResult.vercel,
  };
}
