/**
 * Orquesta el aprovisionamiento de subdominios de tienda en Cloudflare + Vercel.
 * Diseñado para ejecutarse en fire-and-forget desde server actions.
 */

import {
  getDomainProvisioningConfig,
  isStoreSubdomainProvisioningEnabled,
} from "@/lib/domains/config";
import { ensureCloudflareStoreCname } from "@/lib/domains/cloudflare-dns";
import {
  ensureVercelProjectDomain,
  removeVercelProjectDomain,
} from "@/lib/domains/vercel-domains";
import { isValidStoreSlug } from "@/lib/stores/slug";

export interface ProvisionStoreSubdomainInput {
  storeId: string;
  slug: string;
}

export interface ProvisionStoreSubdomainResult {
  skipped: boolean;
  slug: string;
  cloudflare?: { created: boolean };
  vercel?: { created: boolean };
  error?: string;
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

/**
 * Crea (o verifica) el subdominio `{slug}.{apex}` en Cloudflare y Vercel.
 * No lanza excepciones: devuelve `{ skipped: true }` si el feature está apagado.
 */
export async function provisionStoreSubdomain(
  input: ProvisionStoreSubdomainInput,
): Promise<ProvisionStoreSubdomainResult> {
  const slug = input.slug.trim().toLowerCase();

  if (!isValidStoreSlug(slug)) {
    return { skipped: true, slug, error: "Slug inválido para subdominio." };
  }

  if (!isStoreSubdomainProvisioningEnabled()) {
    return { skipped: true, slug };
  }

  const config = getDomainProvisioningConfig();
  if (!config) {
    logProvision("missing_config", { storeId: input.storeId, slug });
    return {
      skipped: true,
      slug,
      error: "STORE_SUBDOMAIN_PROVISION_ENABLED=true pero faltan credenciales.",
    };
  }

  const cloudflare = await ensureCloudflareStoreCname(config, slug);
  if (!cloudflare.ok) {
    logProvision("cloudflare_failed", {
      storeId: input.storeId,
      slug,
      error: cloudflare.error,
    });
    return { skipped: false, slug, error: cloudflare.error };
  }

  const vercel = await ensureVercelProjectDomain(config, slug);
  if (!vercel.ok) {
    logProvision("vercel_failed", {
      storeId: input.storeId,
      slug,
      error: vercel.error,
    });
    return { skipped: false, slug, error: vercel.error };
  }

  logProvision("success", {
    storeId: input.storeId,
    slug,
    cloudflareCreated: cloudflare.created,
    vercelCreated: vercel.created,
  });

  return {
    skipped: false,
    slug,
    cloudflare: { created: cloudflare.created },
    vercel: { created: vercel.created },
  };
}

/**
 * Limpia el subdominio anterior cuando el slug cambia (opcional).
 * No revierte el wildcard; solo elimina registros explícitos creados por la app.
 */
export async function deprovisionStoreSubdomain(
  slug: string,
): Promise<void> {
  const config = getDomainProvisioningConfig();
  if (!config || !isValidStoreSlug(slug)) return;

  const { removeCloudflareStoreCname } = await import(
    "@/lib/domains/cloudflare-dns"
  );

  await removeCloudflareStoreCname(config, slug);
  await removeVercelProjectDomain(config, slug);
}

/** Fire-and-forget seguro para no bloquear onboarding ni ajustes. */
export function scheduleStoreSubdomainProvision(
  input: ProvisionStoreSubdomainInput,
): void {
  void provisionStoreSubdomain(input).catch((error: unknown) => {
    logProvision("unhandled_error", {
      storeId: input.storeId,
      slug: input.slug,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/** Al renombrar slug: aprovisiona el nuevo y limpia el anterior. */
export function scheduleStoreSubdomainRename(
  storeId: string,
  previousSlug: string,
  nextSlug: string,
): void {
  if (previousSlug === nextSlug) return;

  scheduleStoreSubdomainProvision({ storeId, slug: nextSlug });

  void deprovisionStoreSubdomain(previousSlug).catch((error: unknown) => {
    logProvision("deprovision_failed", {
      storeId,
      slug: previousSlug,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
