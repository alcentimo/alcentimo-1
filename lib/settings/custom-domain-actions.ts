"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  normalizeCustomDomain,
  validateCustomDomainInput,
} from "@/lib/domains/custom-domain";
import {
  verifyCustomDomainDns,
  type CustomDomainDnsVerificationResult,
} from "@/lib/domains/verify-custom-domain-dns";
import {
  ensureVercelCustomDomain,
  isVercelCustomDomainProvisioningEnabled,
  removeVercelCustomDomain,
  getVercelCustomDomainStatus,
} from "@/lib/domains/vercel-project-domain";

export type CustomDomainActionResult = {
  error?: string;
  success?: boolean;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  verification?: CustomDomainDnsVerificationResult;
  vercelProvisioned?: boolean;
  vercelSslReady?: boolean;
};

async function findStoreIdByCustomDomain(
  domain: string,
  excludeStoreId?: string,
): Promise<string | null> {
  const supabase = await createClient();
  let query = supabase
    .from("stores")
    .select("id")
    .eq("custom_domain", domain)
    .limit(1);

  if (excludeStoreId) {
    query = query.neq("id", excludeStoreId);
  }

  const { data } = await query.maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function provisionDomainOnVercel(
  domain: string,
): Promise<
  | { ok: true; sslReady: boolean; cnameTarget: string | null }
  | { ok: false; error: string }
> {
  if (!isVercelCustomDomainProvisioningEnabled()) {
    return {
      ok: false,
      error:
        "El registro automático en Vercel no está configurado. Añade VERCEL_API_TOKEN y VERCEL_PROJECT_ID en el entorno del servidor.",
    };
  }

  const result = await ensureVercelCustomDomain(domain);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    sslReady: result.sslReady,
    cnameTarget: result.cnameTarget,
  };
}

export async function saveStoreCustomDomainRequest(
  domainInput: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const previousDomain = normalizeCustomDomain(auth.store.custom_domain ?? "");
  const normalized = normalizeCustomDomain(domainInput);
  const occupiedByStoreId = normalized
    ? await findStoreIdByCustomDomain(normalized, auth.store.id)
    : null;

  const validated = validateCustomDomainInput(domainInput, {
    currentStoreId: auth.store.id,
    occupiedByStoreId,
  });

  if (validated.error) return { error: validated.error };

  // Vaciar dominio = limpiar en Vercel + Supabase.
  if (!validated.domain) {
    if (previousDomain) {
      const removed = await removeVercelCustomDomain(previousDomain);
      if (!removed.ok) {
        return {
          error: `No se pudo quitar el dominio de Vercel: ${removed.error}`,
        };
      }
    }

    const { error } = await supabase
      .from("stores")
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        custom_domain_verified_at: null,
      })
      .eq("id", auth.store.id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/ajustes");
    revalidatePath(`/c/${auth.store.slug}`);

    return {
      success: true,
      customDomain: null,
      customDomainVerified: false,
      vercelProvisioned: true,
    };
  }

  // 1) Registrar en Vercel (SSL automático cuando DNS esté listo).
  const provision = await provisionDomainOnVercel(validated.domain);
  if (!provision.ok) {
    return { error: provision.error };
  }

  // 2) Si cambió el dominio, quitar el anterior del proyecto.
  if (previousDomain && previousDomain !== validated.domain) {
    const removed = await removeVercelCustomDomain(previousDomain);
    if (!removed.ok) {
      // Dominio nuevo ya está en Vercel; avisar pero no revertir.
      console.warn(
        JSON.stringify({
          scope: "custom-domain-vercel",
          event: "previous_remove_failed",
          previousDomain,
          error: removed.error,
        }),
      );
    }
  }

  // 3) Persistir en Supabase (aún sin verificar DNS).
  const { error } = await supabase
    .from("stores")
    .update({
      custom_domain: validated.domain,
      custom_domain_verified: false,
      custom_domain_verified_at: null,
    })
    .eq("id", auth.store.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese dominio ya está asociado a otra tienda." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);

  return {
    success: true,
    customDomain: validated.domain,
    customDomainVerified: false,
    vercelProvisioned: true,
    vercelSslReady: provision.sslReady,
  };
}

export async function clearStoreCustomDomainRequest(): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const previousDomain = normalizeCustomDomain(auth.store.custom_domain ?? "");

  if (previousDomain) {
    const removed = await removeVercelCustomDomain(previousDomain);
    if (!removed.ok && isVercelCustomDomainProvisioningEnabled()) {
      return {
        error: `No se pudo quitar el dominio de Vercel: ${removed.error}`,
      };
    }
  }

  const { error } = await supabase
    .from("stores")
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      custom_domain_verified_at: null,
    })
    .eq("id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);

  return {
    success: true,
    customDomain: null,
    customDomainVerified: false,
    vercelProvisioned: true,
  };
}

export async function verifyStoreCustomDomainRequest(
  domainInput?: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const domain =
    normalizeCustomDomain(domainInput ?? "") ??
    normalizeCustomDomain(auth.store.custom_domain ?? "");

  if (!domain) {
    return {
      error: "Guarda un dominio válido antes de verificar la conexión.",
    };
  }

  if (
    auth.store.custom_domain &&
    normalizeCustomDomain(auth.store.custom_domain) !== domain
  ) {
    return {
      error: "Guarda el dominio antes de verificar, o usa el dominio ya guardado.",
    };
  }

  // Asegurar que el dominio sigue en el proyecto Vercel (idempotente).
  const provision = await provisionDomainOnVercel(domain);
  if (!provision.ok) {
    return { error: provision.error };
  }

  let verification: CustomDomainDnsVerificationResult;
  try {
    verification = await verifyCustomDomainDns(domain);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo comprobar el DNS del dominio.";
    return { error: message };
  }

  if (!verification.ok) {
    return {
      success: false,
      customDomain: domain,
      customDomainVerified: false,
      verification,
      vercelProvisioned: true,
      vercelSslReady: provision.sslReady,
    };
  }

  // DNS ok: confirmar estado SSL en Vercel (misconfigured = aún no listo).
  let sslReady = provision.sslReady;
  if (isVercelCustomDomainProvisioningEnabled()) {
    const status = await getVercelCustomDomainStatus(domain);
    if (status.ok) {
      sslReady = status.sslReady;
    }
  }

  if (!sslReady) {
    return {
      success: false,
      customDomain: domain,
      customDomainVerified: false,
      vercelProvisioned: true,
      vercelSslReady: false,
      verification: {
        ...verification,
        ok: false,
        status: "pending",
        message: "DNS correcto. Vercel aún está emitiendo el certificado SSL.",
        summary:
          "Tu DNS ya apunta bien. Espera unos minutos y vuelve a verificar para activar HTTPS.",
        suggestions: [
          ...(verification.suggestions ?? []),
          "Vercel emite el certificado SSL automáticamente cuando el DNS está bien. Suele tardar unos minutos.",
          "Si usas apex (midominio.com), asegúrate del registro A 76.76.21.21 y/o CNAME en www.",
        ],
      },
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stores")
    .update({
      custom_domain: domain,
      custom_domain_verified: true,
      custom_domain_verified_at: now,
    })
    .eq("id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${auth.store.slug}`);

  return {
    success: true,
    customDomain: domain,
    customDomainVerified: true,
    vercelProvisioned: true,
    vercelSslReady: true,
    verification: {
      ...verification,
      summary:
        "Tu dominio apunta correctamente a Alcentimo, el SSL de Vercel está listo y el catálogo ya está activo.",
    },
  };
}
