import { cache } from "react";
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
import { syncDuePendingPlanForUser } from "@/lib/plans/pending-plan";
import { getStoreMemberRole } from "@/lib/team/access";
import type { DashboardStoreRole } from "@/lib/team/permissions";

export interface UserWithPlan {
  id: string;
  email?: string;
  profile: Profile | null;
  planId: PlanId;
  plan: PlanDefinition;
  /** Valor crudo en BD (p. ej. `FREE`) */
  rawPlan: string;
  /** Nombre visible desde user_metadata (auth). */
  displayName: string | null;
  /** Si el usuario tiene identidad email/contraseña. */
  hasPasswordLogin: boolean;
}

export interface DashboardSession {
  authUser: UserWithPlan;
  store: Store | null;
  storeRole: import("@/lib/team/permissions").DashboardStoreRole | null;
}

export async function getUserPlanIdById(userId: string): Promise<PlanId> {
  const client = await createClient();
  return getUserPlanId(client, userId);
}

/** Usuario autenticado, su plan y la tienda asociada (si existe). */
export const getDashboardSession = cache(
  async (): Promise<DashboardSession | null> => {
    const client = await createClient();
    const authUser = await getAuthUserWithPlan(client);
    if (!authUser) return null;

    try {
      await syncDuePendingPlanForUser(authUser.id);
    } catch {
      // No bloquear el dashboard si falla el lazy-apply del downgrade.
    }

    const refreshedUser = await getAuthUserWithPlan(client);
    const sessionBase = refreshedUser ?? authUser;

    const store = await getUserStore(client, sessionBase.id);
    const sessionUser = store
      ? await applyStoreOwnerPlanToUser(sessionBase, store.id)
      : sessionBase;

    let storeRole: DashboardStoreRole | null = null;
    if (store) {
      storeRole = await getStoreMemberRole(client, store.id, sessionBase.id);
    }

    return { authUser: sessionUser, store, storeRole };
  },
);

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
    pro_trial_closed_at: ownerPlan.pro_trial_closed_at ?? null,
    billing_period: ownerPlan.billing_period,
    subscription_period_started_at: ownerPlan.subscription_period_started_at,
    subscription_period_ends_at: ownerPlan.subscription_period_ends_at,
    pending_plan: ownerPlan.pending_plan ?? null,
    pending_billing_period: ownerPlan.pending_billing_period ?? null,
    pending_plan_effective_at: ownerPlan.pending_plan_effective_at ?? null,
    pending_plan_requested_at: ownerPlan.pending_plan_requested_at ?? null,
    extra_locations_authorized: ownerPlan.extra_locations_authorized ?? 0,
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
    "id, plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, pro_trial_closed_at, billing_period, subscription_period_started_at, subscription_period_ends_at, pending_plan, pending_billing_period, pending_plan_effective_at, pending_plan_requested_at, extra_locations_authorized, created_at, updated_at";

  const { data, error } = await client
    .from("profiles")
    .select(fullSelect)
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return data;
  }

  // Fallback si columnas nuevas aún no existen en el proyecto remoto.
  const { data: withPeriod, error: periodError } = await client
    .from("profiles")
    .select(
      "id, plan, subscription_status, pro_trial_started_at, pro_trial_ends_at, pro_trial_closed_at, billing_period, subscription_period_started_at, subscription_period_ends_at, extra_locations_authorized, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!periodError && withPeriod) {
    return {
      ...withPeriod,
      pending_plan: null,
      pending_billing_period: null,
      pending_plan_effective_at: null,
      pending_plan_requested_at: null,
    };
  }

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
      pro_trial_closed_at: null,
      billing_period: null,
      subscription_period_started_at: null,
      subscription_period_ends_at: null,
      pending_plan: null,
      pending_billing_period: null,
      pending_plan_effective_at: null,
      pending_plan_requested_at: null,
      extra_locations_authorized: 0,
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
    pending_plan: null,
    pending_billing_period: null,
    pending_plan_effective_at: null,
    pending_plan_requested_at: null,
  };
}

export async function getUserPlanId(
  client: SupabaseServerClient,
  userId: string,
): Promise<PlanId> {
  const profile = await getUserProfile(client, userId);
  return resolvePlanId(profile?.plan);
}

function resolveAuthDisplayName(user: {
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  const fromDisplay =
    typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
  if (fromDisplay) return fromDisplay;
  const fromFull =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fromFull) return fromFull;
  return null;
}

function resolveHasPasswordLogin(user: {
  identities?: Array<{ provider: string }> | null;
}): boolean {
  return (
    user.identities?.some((identity) => identity.provider === "email") ?? false
  );
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
    displayName: resolveAuthDisplayName(user),
    hasPasswordLogin: resolveHasPasswordLogin(user),
  };
}
