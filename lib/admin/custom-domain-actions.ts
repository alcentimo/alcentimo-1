"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import {
  normalizeCustomDomain,
  validateCustomDomainInput,
} from "@/lib/domains/custom-domain";

export type AdminCustomDomainActionResult = {
  error?: string;
  success?: boolean;
};

export interface AdminStoreDomainRow {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: string | null;
  isActive: boolean;
}

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }

  return { ok: true as const };
}

function revalidateDomainPaths(storeSlug: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/ajustes");
  revalidatePath(`/c/${storeSlug}`);
}

export async function listAdminStoreDomains(): Promise<AdminStoreDomainRow[]> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stores")
    .select(
      "id, name, slug, custom_domain, custom_domain_verified, custom_domain_verified_at, is_active",
    )
    .not("custom_domain", "is", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    customDomain: (row.custom_domain as string | null) ?? null,
    customDomainVerified: Boolean(row.custom_domain_verified),
    customDomainVerifiedAt:
      (row.custom_domain_verified_at as string | null) ?? null,
    isActive: Boolean(row.is_active),
  }));
}

export async function searchAdminStoresForDomain(
  query: string,
): Promise<AdminStoreDomainRow[]> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const trimmed = query.trim();
  if (!trimmed) return [];

  const admin = createAdminClient();
  const slugCandidate = trimmed.toLowerCase();

  const { data, error } = await admin
    .from("stores")
    .select(
      "id, name, slug, custom_domain, custom_domain_verified, custom_domain_verified_at, is_active",
    )
    .or(`slug.ilike.%${slugCandidate}%,name.ilike.%${trimmed}%`)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    customDomain: (row.custom_domain as string | null) ?? null,
    customDomainVerified: Boolean(row.custom_domain_verified),
    customDomainVerifiedAt:
      (row.custom_domain_verified_at as string | null) ?? null,
    isActive: Boolean(row.is_active),
  }));
}

export async function adminAssignStoreCustomDomain(input: {
  storeId: string;
  domain: string;
  verified?: boolean;
}): Promise<AdminCustomDomainActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const storeId = input.storeId.trim();
  if (!storeId) return { error: "Selecciona una tienda." };

  const admin = createAdminClient();

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id, slug")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) return { error: storeError.message };
  if (!store) return { error: "Tienda no encontrada." };

  const validated = validateCustomDomainInput(input.domain, {
    currentStoreId: storeId,
  });

  if (validated.error) return { error: validated.error };

  if (validated.domain) {
    const { data: occupied } = await admin
      .from("stores")
      .select("id")
      .eq("custom_domain", validated.domain)
      .neq("id", storeId)
      .maybeSingle();

    if (occupied?.id) {
      return { error: "Ese dominio ya está asociado a otra tienda." };
    }
  }

  const verified = input.verified ?? true;
  const now = new Date().toISOString();

  const { error } = await admin
    .from("stores")
    .update({
      custom_domain: validated.domain,
      custom_domain_verified: verified && Boolean(validated.domain),
      custom_domain_verified_at:
        verified && validated.domain ? now : null,
    })
    .eq("id", storeId);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese dominio ya está asociado a otra tienda." };
    }
    return { error: error.message };
  }

  revalidateDomainPaths(store.slug as string);
  return { success: true };
}

export async function adminVerifyStoreCustomDomain(
  storeId: string,
): Promise<AdminCustomDomainActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data: store, error: lookupError } = await admin
    .from("stores")
    .select("id, slug, custom_domain")
    .eq("id", storeId)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!store?.custom_domain) {
    return { error: "La tienda no tiene dominio personalizado configurado." };
  }

  const { error } = await admin
    .from("stores")
    .update({
      custom_domain_verified: true,
      custom_domain_verified_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (error) return { error: error.message };

  revalidateDomainPaths(store.slug as string);
  return { success: true };
}

export async function adminRemoveStoreCustomDomain(
  storeId: string,
): Promise<AdminCustomDomainActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data: store, error: lookupError } = await admin
    .from("stores")
    .select("id, slug")
    .eq("id", storeId)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!store) return { error: "Tienda no encontrada." };

  const { error } = await admin
    .from("stores")
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      custom_domain_verified_at: null,
    })
    .eq("id", storeId);

  if (error) return { error: error.message };

  revalidateDomainPaths(store.slug as string);
  return { success: true };
}
