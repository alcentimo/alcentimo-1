import type { VentaWithProduct } from "@/lib/sales/types";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function getContactPurchaseHistory(
  conversation: MessageConversation,
  sales: VentaWithProduct[],
  limit = 5,
): VentaWithProduct[] {
  const phoneDigits = normalizeDigits(
    conversation.phoneE164 ?? conversation.senderId,
  );

  if (!phoneDigits) return [];

  return sales
    .filter((sale) => {
      const haystack = [
        sale.notas,
        sale.external_reference,
        sale.canal_venta,
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeDigits(haystack).includes(phoneDigits);
    })
    .slice(0, limit);
}

export function isPersistedConversation(conversationId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    conversationId,
  );
}
