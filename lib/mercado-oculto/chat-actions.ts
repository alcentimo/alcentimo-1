"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserWithPlan } from "@/lib/auth/get-user-profile";
import { hasMercadoOcultoSubscription } from "@/lib/mercado-oculto/access";
import { getMercadoProduct } from "@/lib/mercado-oculto/product-actions";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

export interface MercadoMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
}

export interface MercadoConversationSummary {
  id: string;
  productId: string;
  storeId: string;
  sellerUserId: string;
  buyerUserId: string;
  createdAt: string;
  updatedAt: string;
  productName: string | null;
  storeName: string | null;
  role: "buyer" | "seller";
  lastMessagePreview: string | null;
}

async function requireMercadoUser() {
  const supabase = await createClient();
  const authUser = await getAuthUserWithPlan(supabase);
  if (!authUser) {
    return { error: "Debes iniciar sesión." } as const;
  }
  if (!hasMercadoOcultoSubscription(authUser.profile)) {
    return {
      error:
        "El mercado oculto es exclusivo para suscriptores activos de Alcéntimo.",
    } as const;
  }
  return { user: authUser } as const;
}

function mapMessage(row: Record<string, unknown>): MercadoMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    senderUserId: String(row.sender_user_id),
    body: String(row.body ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function getOrCreateMercadoConversation(
  productId: string,
): Promise<ActionResult<{ conversationId: string; isSeller: boolean }>> {
  const gate = await requireMercadoUser();
  if ("error" in gate) return { error: gate.error };
  const { user } = gate;

  const productResult = await getMercadoProduct(productId);
  if (productResult.error || !productResult.product || !productResult.sellerUserId) {
    return { error: productResult.error ?? "Producto no disponible." };
  }

  const sellerUserId = productResult.sellerUserId;
  if (sellerUserId === user.id) {
    return { conversationId: "", isSeller: true };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("mercado_conversations")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    return { conversationId: String(existing.id), isSeller: false };
  }

  const { data: created, error } = await admin
    .from("mercado_conversations")
    .insert({
      product_id: productId,
      store_id: productResult.product.store_id,
      seller_user_id: sellerUserId,
      buyer_user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "No se pudo abrir el chat." };
  }

  return { conversationId: String(created.id), isSeller: false };
}

export async function listMercadoMessages(
  conversationId: string,
): Promise<ActionResult<{ messages: MercadoMessage[] }>> {
  const gate = await requireMercadoUser();
  if ("error" in gate) return { error: gate.error };
  const { user } = gate;

  if (!conversationId.trim()) return { error: "Conversación inválida." };

  const admin = createAdminClient();
  const { data: conversation, error: convError } = await admin
    .from("mercado_conversations")
    .select("id, buyer_user_id, seller_user_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (convError) return { error: convError.message };
  if (!conversation) return { error: "Conversación no encontrada." };

  const buyerId = String((conversation as { buyer_user_id: string }).buyer_user_id);
  const sellerId = String(
    (conversation as { seller_user_id: string }).seller_user_id,
  );
  if (user.id !== buyerId && user.id !== sellerId) {
    return { error: "No tienes acceso a esta conversación." };
  }

  const { data, error } = await admin
    .from("mercado_messages")
    .select("id, conversation_id, sender_user_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { error: error.message };

  return {
    messages: ((data as Record<string, unknown>[] | null) ?? []).map(mapMessage),
  };
}

export async function sendMercadoMessage(input: {
  conversationId: string;
  body: string;
}): Promise<ActionResult<{ message: MercadoMessage }>> {
  const gate = await requireMercadoUser();
  if ("error" in gate) return { error: gate.error };
  const { user } = gate;

  const body = input.body.trim();
  if (body.length < 1) return { error: "Escribe un mensaje." };
  if (body.length > 4000) return { error: "El mensaje es demasiado largo." };

  const admin = createAdminClient();
  const { data: conversation, error: convError } = await admin
    .from("mercado_conversations")
    .select("id, buyer_user_id, seller_user_id, product_id")
    .eq("id", input.conversationId)
    .maybeSingle();

  if (convError) return { error: convError.message };
  if (!conversation) return { error: "Conversación no encontrada." };

  const buyerId = String((conversation as { buyer_user_id: string }).buyer_user_id);
  const sellerId = String(
    (conversation as { seller_user_id: string }).seller_user_id,
  );
  if (user.id !== buyerId && user.id !== sellerId) {
    return { error: "No tienes acceso a esta conversación." };
  }

  const now = new Date().toISOString();
  const { data: inserted, error } = await admin
    .from("mercado_messages")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: user.id,
      body,
    })
    .select("id, conversation_id, sender_user_id, body, created_at")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "No se pudo enviar el mensaje." };
  }

  await admin
    .from("mercado_conversations")
    .update({ updated_at: now })
    .eq("id", input.conversationId);

  const productId = String(
    (conversation as { product_id: string }).product_id,
  );
  revalidatePath("/mercado-oculto");
  revalidatePath(`/mercado-oculto/producto/${productId}`);
  revalidatePath("/mercado-oculto/conversaciones");

  return { message: mapMessage(inserted as Record<string, unknown>) };
}

export async function listMyMercadoConversations(): Promise<
  ActionResult<{ conversations: MercadoConversationSummary[] }>
> {
  const gate = await requireMercadoUser();
  if ("error" in gate) return { error: gate.error };
  const { user } = gate;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mercado_conversations")
    .select(
      "id, product_id, store_id, seller_user_id, buyer_user_id, created_at, updated_at",
    )
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  if (rows.length === 0) return { conversations: [] };

  const productIds = [...new Set(rows.map((row) => String(row.product_id)))];
  const storeIds = [...new Set(rows.map((row) => String(row.store_id)))];
  const conversationIds = rows.map((row) => String(row.id));

  const [{ data: products }, { data: stores }, { data: messages }] =
    await Promise.all([
      admin.from("products").select("id, name").in("id", productIds),
      admin.from("stores").select("id, name").in("id", storeIds),
      admin
        .from("mercado_messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }),
    ]);

  const productNameById = new Map(
    ((products as Array<{ id: string; name: string }> | null) ?? []).map(
      (row) => [row.id, row.name],
    ),
  );
  const storeNameById = new Map(
    ((stores as Array<{ id: string; name: string }> | null) ?? []).map(
      (row) => [row.id, row.name],
    ),
  );

  const lastByConversation = new Map<string, string>();
  for (const msg of (messages as Array<{
    conversation_id: string;
    body: string;
  }> | null) ?? []) {
    if (!lastByConversation.has(msg.conversation_id)) {
      lastByConversation.set(msg.conversation_id, msg.body);
    }
  }

  const conversations: MercadoConversationSummary[] = rows.map((row) => {
    const sellerUserId = String(row.seller_user_id);
    const role: "buyer" | "seller" =
      sellerUserId === user.id ? "seller" : "buyer";
    const id = String(row.id);
    return {
      id,
      productId: String(row.product_id),
      storeId: String(row.store_id),
      sellerUserId,
      buyerUserId: String(row.buyer_user_id),
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
      productName: productNameById.get(String(row.product_id)) ?? null,
      storeName: storeNameById.get(String(row.store_id)) ?? null,
      role,
      lastMessagePreview: lastByConversation.get(id) ?? null,
    };
  });

  return { conversations };
}
