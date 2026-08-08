"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getVapidPublicKey } from "@/lib/notifications/vapid";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
};

export async function getPushVapidPublicKeyAction(): Promise<{
  publicKey: string | null;
}> {
  return { publicKey: getVapidPublicKey() };
}

export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();
  const userAgent = input.userAgent?.trim() || null;

  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "Suscripción incompleta." };
  }

  const supabase = await createClient();
  const authResult = await requireAuthUser(supabase);
  if (!authResult.ok) {
    return { ok: false, error: authResult.error };
  }

  const store = await getUserStore(supabase, authResult.authUser.id);
  if (!store) {
    return { ok: false, error: "No tienes una tienda asociada." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: authResult.authUser.id,
      store_id: store.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deletePushSubscriptionAction(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = endpoint?.trim();
  if (!trimmed) {
    return { ok: false, error: "Endpoint inválido." };
  }

  const supabase = await createClient();
  const authResult = await requireAuthUser(supabase);
  if (!authResult.ok) {
    return { ok: false, error: authResult.error };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", trimmed)
    .eq("user_id", authResult.authUser.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getMyPushSubscriptionStatusAction(): Promise<{
  hasSubscription: boolean;
  vapidConfigured: boolean;
}> {
  const vapidConfigured = Boolean(getVapidPublicKey());
  const supabase = await createClient();
  const authResult = await requireAuthUser(supabase);
  if (!authResult.ok) {
    return { hasSubscription: false, vapidConfigured };
  }

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authResult.authUser.id);

  return {
    hasSubscription: (count ?? 0) > 0,
    vapidConfigured,
  };
}
