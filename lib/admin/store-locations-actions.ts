"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { resolvePlanId } from "@/src/config/plans";
import { getStoreLocations } from "@/lib/locations/get-store-locations";
import { resolveLocationLimit } from "@/lib/locations/limits";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";

export interface AdminStoreLocationRow {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail: string | null;
  plan: string;
  planId: string;
  locationCount: number;
  includedLocations: number;
  extraAuthorized: number;
  maxAllowed: number;
  extraLocationMonthlyUsd: number;
}

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso de administrador." as const };
  }
  return { user };
}

export async function searchAdminStoresForLocations(
  query: string,
): Promise<AdminStoreLocationRow[]> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) throw new Error(auth.error);

  const admin = createAdminClient();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const { data: stores, error } = await admin
    .from("stores")
    .select("id, name, slug, owner_id")
    .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  if (!stores?.length) return [];

  const settings = await fetchPlanSettings();
  const rows: AdminStoreLocationRow[] = [];

  for (const store of stores) {
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, extra_locations_authorized")
      .eq("id", store.owner_id)
      .maybeSingle();

    const { data: userData } = await admin.auth.admin.getUserById(store.owner_id);
    const locations = await getStoreLocations(store.id).catch(() => []);
    const planDb = normalizeDbPlan(profile?.plan);
    const planId = resolvePlanId(planDb);
    const limit = resolveLocationLimit({
      planId,
      extraAuthorized: profile?.extra_locations_authorized ?? 0,
      currentCount: locations.length,
      settings,
    });

    rows.push({
      id: store.id,
      name: store.name,
      slug: store.slug,
      ownerId: store.owner_id,
      ownerEmail: userData.user?.email ?? null,
      plan: planDb,
      planId,
      locationCount: locations.length,
      includedLocations: limit.includedLocations,
      extraAuthorized: limit.extraAuthorized,
      maxAllowed: limit.maxAllowed,
      extraLocationMonthlyUsd: limit.extraLocationMonthlyUsd,
    });
  }

  return rows;
}

export async function adminSetExtraLocationsAuthorized(input: {
  ownerId: string;
  extraAuthorized: number;
}): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireSupportAdmin();
  if ("error" in auth) return { error: auth.error };

  const extra = Math.max(0, Math.min(50, Math.floor(input.extraAuthorized)));
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ extra_locations_authorized: extra })
    .eq("id", input.ownerId);

  if (error) return { error: error.message };

  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/ajustes");
  return { success: true };
}
