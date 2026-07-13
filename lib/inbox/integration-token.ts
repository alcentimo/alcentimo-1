import { createAdminClient } from "@/lib/supabase/admin";

export async function getIntegrationAccessToken(
  integrationId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("channel_integration_secrets")
    .select("access_token")
    .eq("integration_id", integrationId)
    .maybeSingle();

  if (error) {
    console.error("[integration-token] lookup failed:", error);
    return null;
  }

  return data?.access_token?.trim() ?? null;
}
