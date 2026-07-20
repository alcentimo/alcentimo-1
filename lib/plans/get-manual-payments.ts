import { createAdminClient } from "@/lib/supabase/admin";
import type { ManualPayment, ManualPaymentStatus } from "@/lib/database.types";

export interface ManualPaymentWithEmail extends ManualPayment {
  user_email: string | null;
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
  const emails = await resolveUserEmails(userIds);

  return payments.map((payment) => ({
    ...payment,
    user_email: emails.get(payment.user_id) ?? null,
  }));
}
