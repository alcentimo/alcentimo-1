import type { Profile } from "@/lib/database.types";
import type { Store } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import { getUserStore } from "@/lib/stores";
import {
  getPlanById,
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
} from "@/src/config/plans";

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
  return { authUser, store };
}

export async function getUserProfile(
  client: SupabaseServerClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, plan, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Perfil ausente o error de lectura: usar plan FREE por defecto.
    return null;
  }
  return data;
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
  const planId = resolvePlanId(profile?.plan);
  const plan = getPlanById(planId);

  return {
    id: user.id,
    email: user.email,
    profile,
    planId,
    plan,
    rawPlan: profile?.plan ?? "FREE",
  };
}
