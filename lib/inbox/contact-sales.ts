import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { InboxProvider } from "@/lib/inbox/types";

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

const PROVIDER_SALES_CHANNELS: Record<InboxProvider, string[]> = {
  whatsapp: ["whatsapp"],
  messenger: ["facebook", "messenger"],
  instagram: ["instagram"],
  mercadolibre: ["mercado libre", "mercadolibre"],
};

function getContactIdentifiers(conversation: MessageConversation): string[] {
  const values = new Set<string>();

  if (conversation.senderId && conversation.senderId !== "unknown") {
    values.add(conversation.senderId.trim());
    values.add(normalizeDigits(conversation.senderId));
  }

  if (conversation.phoneE164?.trim()) {
    values.add(conversation.phoneE164.trim());
    values.add(normalizeDigits(conversation.phoneE164));
  }

  return [...values].filter(Boolean);
}

function channelMatchesProvider(
  canalVenta: string,
  provider: InboxProvider,
): boolean {
  const normalized = canalVenta.toLowerCase();
  return (PROVIDER_SALES_CHANNELS[provider] ?? []).some((channel) =>
    normalized.includes(channel),
  );
}

function digitsMatch(haystack: string, needle: string): boolean {
  const haystackDigits = normalizeDigits(haystack);
  const needleDigits = normalizeDigits(needle);

  if (!haystackDigits || !needleDigits) return false;
  if (haystackDigits.includes(needleDigits)) return true;

  const minSuffix = Math.min(10, needleDigits.length);
  if (minSuffix >= 7) {
    const suffix = needleDigits.slice(-minSuffix);
    return haystackDigits.includes(suffix);
  }

  return false;
}

export function saleMatchesConversation(
  sale: VentaWithProduct,
  conversation: MessageConversation,
): boolean {
  const identifiers = getContactIdentifiers(conversation);
  const reference = sale.external_reference?.trim() ?? "";
  const notas = sale.notas?.trim() ?? "";

  if (reference) {
    for (const identifier of identifiers) {
      if (
        reference === identifier ||
        reference.includes(identifier) ||
        identifier.includes(reference)
      ) {
        return true;
      }
    }
  }

  const phoneSource = conversation.phoneE164 ?? conversation.senderId;
  if (phoneSource) {
    if (digitsMatch(reference, phoneSource) || digitsMatch(notas, phoneSource)) {
      return true;
    }
  }

  if (
    channelMatchesProvider(sale.canal_venta, conversation.provider) &&
    reference
  ) {
    for (const identifier of identifiers) {
      if (reference.includes(identifier) || identifier.includes(reference)) {
        return true;
      }
    }
  }

  return false;
}

export function getContactPurchaseHistory(
  conversation: MessageConversation,
  sales: VentaWithProduct[],
  limit = 5,
): VentaWithProduct[] {
  return sales
    .filter((sale) => saleMatchesConversation(sale, conversation))
    .slice(0, limit);
}

export function buildConversationSalesMap(
  conversations: MessageConversation[],
  sales: VentaWithProduct[],
  limitPerConversation = 5,
): Record<string, VentaWithProduct[]> {
  const map: Record<string, VentaWithProduct[]> = {};

  for (const conversation of conversations) {
    map[conversation.conversationId] = getContactPurchaseHistory(
      conversation,
      sales,
      limitPerConversation,
    );
  }

  return map;
}
