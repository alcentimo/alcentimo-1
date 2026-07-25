import { createHash, randomBytes } from "node:crypto";
import type { Store } from "@/lib/database.types";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { isStoreOwner } from "@/lib/stores/owner-access";

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function getStoreMemberRole(
  client: SupabaseServerClient,
  storeId: string,
  userId: string,
): Promise<"owner" | "admin" | "staff" | null> {
  const { data: store, error: storeError } = await client
    .from("stores")
    .select("owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError) throw new Error(storeError.message);
  if (store && isStoreOwner(store, userId)) return "owner";

  const { data: member, error: memberError } = await client
    .from("store_members")
    .select("role")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!member?.role) return null;

  if (member.role === "owner" || member.role === "admin" || member.role === "staff") {
    return member.role;
  }
  return null;
}

export async function isStoreTeamAdmin(
  client: SupabaseServerClient,
  store: Pick<Store, "id" | "owner_id">,
  userId: string,
): Promise<boolean> {
  if (isStoreOwner(store, userId)) return true;

  const role = await getStoreMemberRole(client, store.id, userId);
  return role === "admin";
}

export async function requireStoreTeamAdmin(
  client: SupabaseServerClient,
  store: Pick<Store, "id" | "owner_id">,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = await isStoreTeamAdmin(client, store, userId);
  if (!allowed) {
    return {
      ok: false,
      error: "No tienes permiso para gestionar el equipo de esta tienda.",
    };
  }
  return { ok: true };
}

export async function isStoreTeamOwner(
  client: SupabaseServerClient,
  store: Pick<Store, "id" | "owner_id">,
  userId: string,
): Promise<boolean> {
  if (isStoreOwner(store, userId)) return true;
  const role = await getStoreMemberRole(client, store.id, userId);
  return role === "owner";
}
