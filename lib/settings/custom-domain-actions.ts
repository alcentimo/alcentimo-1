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

export type CustomDomainActionResult = {
  error?: string;
  success?: boolean;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  verification?: CustomDomainDnsVerificationResult;
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

export async function saveStoreCustomDomainRequest(
  domainInput: string,
): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const normalized = normalizeCustomDomain(domainInput);
  const occupiedByStoreId = normalized
    ? await findStoreIdByCustomDomain(normalized, auth.store.id)
    : null;

  const validated = validateCustomDomainInput(domainInput, {
    currentStoreId: auth.store.id,
    occupiedByStoreId,
  });

  if (validated.error) return { error: validated.error };

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
  };
}

export async function clearStoreCustomDomainRequest(): Promise<CustomDomainActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

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

  const verification = await verifyCustomDomainDns(domain);

  if (!verification.ok) {
    return {
      success: false,
      customDomain: domain,
      customDomainVerified: false,
      verification,
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
    verification: {
      ...verification,
      summary:
        "Tu dominio apunta correctamente a Alcentimo y ya está activo en tu catálogo público.",
    },
  };
}
