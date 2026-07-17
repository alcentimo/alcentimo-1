import { createAdminClient } from "@/lib/supabase/admin";
import type { SupportMessage, SupportMessageStatus } from "@/lib/database.types";

export async function getSupportMessages(): Promise<SupportMessage[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("support_messages")
    .select("id, user_id, email, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupportMessage[];
}

export async function updateSupportMessageStatus(
  messageId: string,
  status: SupportMessageStatus,
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_messages")
    .update({ status })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return {};
}
