import { createAdminClient } from "@/lib/supabase/admin";

export type GrowthAuditAction =
  | "grant_pro"
  | "create_coupon"
  | "toggle_coupon"
  | "create_campaign"
  | "toggle_campaign"
  | "send_promo";

export interface GrowthAuditEntry {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetUserId: string | null;
  targetEmail: string | null;
  summary: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export async function logGrowthAction(input: {
  actorId: string;
  action: GrowthAuditAction;
  summary: string;
  targetUserId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("admin_growth_audit_log").insert({
    actor_id: input.actorId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    summary: input.summary.slice(0, 500),
    meta: input.meta ?? {},
  });
}

export async function getGrowthAuditLog(
  limit = 150,
): Promise<GrowthAuditEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_growth_audit_log")
    .select("id, actor_id, action, target_user_id, summary, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 300));

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const userIds = Array.from(
    new Set(
      data
        .flatMap((row) => [row.actor_id, row.target_user_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const emailById = new Map<string, string | null>();
  for (let i = 0; i < userIds.length; i += 40) {
    const chunk = userIds.slice(i, i + 40);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data: authData } = await admin.auth.admin.getUserById(id);
          emailById.set(id, authData.user?.email ?? null);
        } catch {
          emailById.set(id, null);
        }
      }),
    );
  }

  return data.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorEmail: emailById.get(row.actor_id) ?? null,
    action: row.action,
    targetUserId: row.target_user_id,
    targetEmail: row.target_user_id
      ? (emailById.get(row.target_user_id) ?? null)
      : null,
    summary: row.summary,
    meta: (row.meta ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }));
}
