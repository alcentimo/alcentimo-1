import type { Profile } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import { getUserStore } from "@/lib/stores";
import {
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";
import { getDisplayPlanForProfile } from "@/lib/plans/trial";
import { getStoreOwnerPlanProfile } from "@/lib/plans/product-limit";

export interface UserWithPlan {
  id: string;
  email?: string;
  profile: Profile | null;
  planId: PlanId;
  plan: PlanDefinition;
  /** Valor crudo en BD (p. ej. `FREE`) */
  rawPlan: string;
}

export interface DashboardSession {
  authUser: UserWithPlan;
  store: Store | null;
}

export async function getUserPlanIdById(userId: string): Promise<PlanId> {
  const client = await createClient();
  return getUserPlanId(client, userId);
}

/** Usuario autenticado, su plan y la tienda asociada (si existe). */
export async function getDashboardSession(
  client: SupabaseServerClient,
): Promise<DashboardSession | null> {
  const authUser = await getAuthUserWithPlan(client);
  if (!authUser) return null;

  const store = await getUserStore(client, authUser.id);
  const sessionUser = store
    ? await applyStoreOwnerPlanToUser(authUser, store.id)
    : authUser;

  return { authUser: sessionUser, store };
}

async function applyStoreOwnerPlanToUser(
  authUser: UserWithPlan,
  storeId: string,
): Promise<UserWithPlan> {
  const ownerPlan = await getStoreOwnerPlanProfile(storeId);
  if (!ownerPlan) return authUser;

  const ownerProfile: Profile = {
    id: ownerPlan.ownerId,
    plan: ownerPlan.plan ?? "FREE",
    subscription_status: ownerPlan.subscription_status,
    pro_trial_started_at: ownerPlan.pro_trial_started_at,
    pro_trial_ends_at: ownerPlan.pro_trial_ends_at,
    billing_period: ownerPlan.billing_period,
    subscription_period_started_at: ownerPlan.subscription_period_started_at,
    subscription_period_ends_at: ownerPlan.subscription_period_ends_at,
  };

  const displayPlan = getDisplayPlanForProfile(ownerProfile);

  return {
    ...authUser,
    profile: ownerProfile,
    planId: displayPlan.planId,
    plan: { ...displayPlan.plan, name: displayPlan.planName },
    rawPlan: ownerPlan.plan ?? "FREE",
  };
}

export async function getUserProfile(
  client: SupabaseServerClient,
  userId: string,
): Promise<Profile | null> {
  const fullSelect =
    "id, plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, billing_period, subscription_period_started_at, subscription_period_ends_at, created_at, updated_at";

  const { data, error } = await client
    .from("profiles")
    .select(fullSelect)
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return data;
  }

  // Fallback si columnas nuevas aún no existen en el proyecto remoto.
  const { data: fallback, error: fallbackError } = await client
    .from("profiles")
    .select(
      "id, plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!fallbackError && fallback) {
    return {
      ...fallback,
      billing_period: null,
      subscription_period_started_at: null,
      subscription_period_ends_at: null,
    };
  }

  const { data: legacy, error: legacyError } = await client
    .from("profiles")
    .select(
      "id, plan, pro_trial_started_at, pro_trial_ends_at, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (legacyError || !legacy) {
    return null;
  }

  return {
    ...legacy,
    subscription_status: "none",
    billing_period: null,
    subscription_period_started_at: null,
    subscription_period_ends_at: null,
  };
}

export async function getUserPlanId(
  client: SupabaseServerClient,
  userId: string,
): Promise<PlanId> {
  const profile = await getUserProfile(client, userId);
  return resolvePlanId(profile?.plan);
}

/** Usuario autenticado con su plan actual desde `profiles`. */
export async function getAuthUserWithPlan(
  client: SupabaseServerClient,
): Promise<UserWithPlan | null> {
  const user = await getOptionalAuthUser(client);
  if (!user) return null;

  const profile = await getUserProfile(client, user.id);
  const displayPlan = getDisplayPlanForProfile(profile);

  return {
    id: user.id,
    email: user.email,
    profile,
    planId: displayPlan.planId,
    plan: { ...displayPlan.plan, name: displayPlan.planName },
    rawPlan: profile?.plan ?? "FREE",
  };
}
