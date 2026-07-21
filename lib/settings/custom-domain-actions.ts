"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  normalizeCustomDomain,
  validateCustomDomainInput,
} from "@/lib/domains/custom-domain";

export type CustomDomainActionResult = {
  error?: string;
  success?: boolean;
  customDomain?: string | null;
  customDomainVerified?: boolean;
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
