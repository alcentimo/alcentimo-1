"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
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
import { getStoreOwnerPlanProfile } from "@/lib/plans/product-limit";
import {
  getEffectivePlanIdForLimits,
  resolveProTrialStatus,
} from "@/lib/plans/trial";
import { DASHBOARD_PLANS_HREF, MERCHANT_SUBSCRIPTION_BILLING_ENABLED, resolvePlanId } from "@/src/config/plans";
import { planIncludesCustomDomain } from "@/src/config/plan-pricing-ui";

export type CustomDomainActionResult = {
  error?: string;
  success?: boolean;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  verification?: CustomDomainDnsVerificationResult;
  /** true solo cuando el dominio ya se registró en Vercel tras DNS ok */
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

/**
 * Quita de Vercel solo dominios que ya pudieron haberse provisionado
 * (los verificados). Los pendientes nunca deben ocupar un slot en Vercel.
 */
async function removeProvisionedDomainFromVercel(
  domain: string,
  wasVerified: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!wasVerified || !domain) {
    return { ok: true };
  }

  const removed = await removeVercelCustomDomain(domain);
  if (!removed.ok && isVercelCustomDomainProvisioningEnabled()) {
    return {
      ok: false,
      error: `No se pudo quitar el dominio de Vercel: ${removed.error}`,
    };
  }

  return { ok: true };
}

/**
 * Requiere la contraseña actual de la cuenta antes de una acción destructiva
 * (p. ej. quitar el dominio personalizado).
 */
async function verifyAccountPasswordForDestructiveAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const password = currentPassword.trim();
  if (!password) {
    return {
      ok: false,
      error: "Ingresa tu contraseña actual para continuar.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const hasPasswordLogin =
    user.identities?.some((identity) => identity.provider === "email") ?? false;

  if (!hasPasswordLogin) {
    return {
      ok: false,
      error:
        "Tu cuenta no tiene contraseña. Configúrala en Cuenta → Seguridad antes de quitar el dominio.",
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (verifyError) {
    return { ok: false, error: "La contraseña no es correcta." };
  }

  return { ok: true };
}

/**
 * Solo Plan Profesional (y superiores / trial activo) pueden guardar o verificar
 * un dominio personalizado. Quitar dominio sigue permitido sin plan pago.
 */
async function requireCustomDomainPlan(
  storeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!MERCHANT_SUBSCRIPTION_BILLING_ENABLED) {
    return { ok: true };
  }

  const owner = await getStoreOwnerPlanProfile(storeId);
  const planId = owner ? resolvePlanId(owner.plan) : resolvePlanId("free");
  const trial = resolveProTrialStatus(owner, planId);
  const effectivePlanId = getEffectivePlanIdForLimits(planId, trial);

  if (!planIncludesCustomDomain(effectivePlanId)) {
    return {
      ok: false,
      error: `El dominio personalizado está disponible desde el Plan Profesional. Mejora tu plan en ${DASHBOARD_PLANS_HREF}.`,
    };
  }

  return { ok: true };
}

export async function saveStoreCustomDomainRequest(
  domainInput: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const planCheck = await requireCustomDomainPlan(auth.store.id);
  if (!planCheck.ok) return { error: planCheck.error };

  const previousDomain = normalizeCustomDomain(auth.store.custom_domain ?? "");
  const previousVerified = Boolean(auth.store.custom_domain_verified);
  const normalized = normalizeCustomDomain(domainInput);
  const occupiedByStoreId = normalized
    ? await findStoreIdByCustomDomain(normalized, auth.store.id)
    : null;

  const validated = validateCustomDomainInput(domainInput, {
    currentStoreId: auth.store.id,
    occupiedByStoreId,
  });

  if (validated.error) return { error: validated.error };

  // Vaciar dominio solo vía clearStoreCustomDomainRequest (requiere contraseña).
  if (!validated.domain) {
    if (previousDomain) {
      return {
        error:
          "Para quitar el dominio usa «Quitar dominio» y confirma con tu contraseña.",
      };
    }

    return {
      success: true,
      customDomain: null,
      customDomainVerified: false,
      vercelProvisioned: false,
    };
  }

  // Si cambia el dominio y el anterior ya estaba en Vercel, liberarlo.
  if (previousDomain && previousDomain !== validated.domain) {
    const removed = await removeProvisionedDomainFromVercel(
      previousDomain,
      previousVerified,
    );
    if (!removed.ok) return { error: removed.error };
  }

  // Solo persistir como pendiente: NO registrar en Vercel hasta verificar DNS.
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
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });

  return {
    success: true,
    customDomain: validated.domain,
    customDomainVerified: false,
    vercelProvisioned: false,
  };
}

export async function clearStoreCustomDomainRequest(
  currentPassword: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const passwordCheck = await verifyAccountPasswordForDestructiveAction(
    supabase,
    currentPassword,
  );
  if (!passwordCheck.ok) {
    return { error: passwordCheck.error };
  }

  const previousDomain = normalizeCustomDomain(auth.store.custom_domain ?? "");
  const previousVerified = Boolean(auth.store.custom_domain_verified);

  if (!previousDomain) {
    return {
      success: true,
      customDomain: null,
      customDomainVerified: false,
      vercelProvisioned: false,
    };
  }

  const removed = await removeProvisionedDomainFromVercel(
    previousDomain,
    previousVerified,
  );
  if (!removed.ok) return { error: removed.error };

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
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });

  return {
    success: true,
    customDomain: null,
    customDomainVerified: false,
    vercelProvisioned: false,
  };
}

export async function verifyStoreCustomDomainRequest(
  domainInput?: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const planCheck = await requireCustomDomainPlan(auth.store.id);
  if (!planCheck.ok) return { error: planCheck.error };

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

  // 1) Demostrar control DNS (CNAME/A) ANTES de tocar la API de Vercel.
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
      vercelProvisioned: false,
      vercelSslReady: false,
    };
  }

  // 2) Solo con DNS correcto: registrar en Vercel (SSL automático).
  const provision = await provisionDomainOnVercel(domain);
  if (!provision.ok) {
    return { error: provision.error };
  }

  // 3) Confirmar que Vercel ya no marca misconfigured.
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
        message: "Casi listo: activando la conexión segura",
        summary:
          "Tu dominio ya apunta bien. Estamos activando el candado de seguridad (HTTPS). Espera unos minutos y vuelve a comprobar.",
        suggestions: [
          ...(verification.suggestions ?? []),
          "El candado HTTPS se activa solo; suele tardar unos minutos.",
          "Si usas el dominio sin www, confirma también el registro opcional del paso 2.",
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
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });

  return {
    success: true,
    customDomain: domain,
    customDomainVerified: true,
    vercelProvisioned: true,
    vercelSslReady: true,
    verification: {
      ...verification,
      summary:
        "Tu dominio apunta a Alcéntimo, la conexión segura está lista y tu catálogo ya está activo.",
    },
  };
}
