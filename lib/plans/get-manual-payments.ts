import { createAdminClient } from "@/lib/supabase/admin";
import type { ManualPayment, ManualPaymentStatus } from "@/lib/database.types";

export interface ManualPaymentStoreInfo {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

export interface ManualPaymentWithEmail extends ManualPayment {
  user_email: string | null;
  stores: ManualPaymentStoreInfo[];
  /** Perfil que se activa al confirmar (dueño de la tienda / pagador). */
  owner_id: string;
  owner_plan: string | null;
  owner_subscription_status: string | null;
}

async function resolveUserEmails(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const emailByUserId = new Map<string, string | null>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      emailByUserId.set(
        userId,
        error ? null : (data.user?.email?.trim() ?? null),
      );
    }),
  );

  return emailByUserId;
}

async function resolveStoresByOwnerIds(
  ownerIds: string[],
): Promise<Map<string, ManualPaymentStoreInfo[]>> {
  const admin = createAdminClient();
  const storesByOwner = new Map<string, ManualPaymentStoreInfo[]>();

  if (ownerIds.length === 0) return storesByOwner;

  const { data, error } = await admin
    .from("stores")
    .select("id, name, slug, owner_id")
    .in("owner_id", ownerIds)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const store of data ?? []) {
    const list = storesByOwner.get(store.owner_id) ?? [];
    list.push({
      id: store.id,
      name: store.name,
      slug: store.slug,
      owner_id: store.owner_id,
    });
    storesByOwner.set(store.owner_id, list);
  }

  return storesByOwner;
}

async function resolveOwnerProfiles(
  ownerIds: string[],
): Promise<
  Map<string, { plan: string | null; subscription_status: string | null }>
> {
  const admin = createAdminClient();
  const profiles = new Map<
    string,
    { plan: string | null; subscription_status: string | null }
  >();

  if (ownerIds.length === 0) return profiles;

  const { data, error } = await admin
    .from("profiles")
    .select("id, plan, subscription_status")
    .in("id", ownerIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const profile of data ?? []) {
    profiles.set(profile.id, {
      plan: profile.plan ?? null,
      subscription_status: profile.subscription_status ?? null,
    });
  }

  return profiles;
}

export async function getManualPayments(options?: {
  status?: ManualPaymentStatus | "all";
  limit?: number;
}): Promise<ManualPaymentWithEmail[]> {
  const admin = createAdminClient();
  const limit = options?.limit ?? 100;

  let query = admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, reference_number, image_url, status, created_at, verified_at, rejected_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const payments = (data ?? []) as ManualPayment[];
  const userIds = [...new Set(payments.map((item) => item.user_id))];
  const [emails, storesByOwner, ownerProfiles] = await Promise.all([
    resolveUserEmails(userIds),
    resolveStoresByOwnerIds(userIds),
    resolveOwnerProfiles(userIds),
  ]);

  return payments.map((payment) => {
    const ownerProfile = ownerProfiles.get(payment.user_id);
    return {
      ...payment,
      user_email: emails.get(payment.user_id) ?? null,
      stores: storesByOwner.get(payment.user_id) ?? [],
      owner_id: payment.user_id,
      owner_plan: ownerProfile?.plan ?? null,
      owner_subscription_status: ownerProfile?.subscription_status ?? null,
    };
  });
}
