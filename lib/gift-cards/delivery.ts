import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import {
  GIFT_CARD_FROM_GROUP_ID,
  GIFT_CARD_MESSAGE_GROUP_ID,
  GIFT_CARD_PUBLIC_IMAGE_PATH,
  GIFT_CARD_RECIPIENT_GROUP_ID,
} from "@/lib/gift-cards/catalog";

export { GIFT_CARD_PUBLIC_IMAGE_PATH };

export const GIFT_CARD_FROM_MAX = 80;
export const GIFT_CARD_MESSAGE_MAX = 500;

export interface GiftCardDelivery {
  recipientEmail: string;
  fromName: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeGiftRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidGiftRecipientEmail(value: string): boolean {
  const email = normalizeGiftRecipientEmail(value);
  return email.length > 3 && email.length <= 254 && EMAIL_RE.test(email);
}

export function sanitizeGiftFromName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, GIFT_CARD_FROM_MAX);
}

export function sanitizeGiftMessage(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, GIFT_CARD_MESSAGE_MAX);
}

export function validateGiftCardDelivery(
  input: Partial<GiftCardDelivery> | null | undefined,
): { ok: true; delivery: GiftCardDelivery } | { ok: false; error: string } {
  const recipientEmail = normalizeGiftRecipientEmail(
    String(input?.recipientEmail ?? ""),
  );
  const fromName = sanitizeGiftFromName(String(input?.fromName ?? ""));
  const message = sanitizeGiftMessage(String(input?.message ?? ""));

  if (!isValidGiftRecipientEmail(recipientEmail)) {
    return {
      ok: false,
      error: "Indica un correo electrónico válido del destinatario.",
    };
  }
  if (fromName.length < 2) {
    return {
      ok: false,
      error: "Indica de parte de quién es el regalo.",
    };
  }
  if (message.length < 2) {
    return {
      ok: false,
      error: "Escribe un mensaje o dedicatoria para el destinatario.",
    };
  }

  return { ok: true, delivery: { recipientEmail, fromName, message } };
}

export function giftCardDeliveryModifiers(
  delivery: GiftCardDelivery,
): CartModifierSelection[] {
  return [
    {
      groupId: GIFT_CARD_RECIPIENT_GROUP_ID,
      groupName: "Para",
      optionId: delivery.recipientEmail,
      optionName: delivery.recipientEmail,
      priceExtraUsd: 0,
    },
    {
      groupId: GIFT_CARD_FROM_GROUP_ID,
      groupName: "De parte de",
      optionId: delivery.fromName.slice(0, 80),
      optionName: delivery.fromName,
      priceExtraUsd: 0,
    },
    {
      groupId: GIFT_CARD_MESSAGE_GROUP_ID,
      groupName: "Mensaje",
      optionId: delivery.message.slice(0, 80),
      optionName: delivery.message,
      priceExtraUsd: 0,
    },
  ];
}

export function isGiftCardDeliveryGroupId(groupId: string): boolean {
  return (
    groupId === GIFT_CARD_RECIPIENT_GROUP_ID ||
    groupId === GIFT_CARD_FROM_GROUP_ID ||
    groupId === GIFT_CARD_MESSAGE_GROUP_ID
  );
}

export function stripGiftCardDeliveryModifiers(
  modifiers: CartModifierSelection[] | undefined,
): CartModifierSelection[] {
  if (!modifiers?.length) return [];
  return modifiers.filter((row) => !isGiftCardDeliveryGroupId(row.groupId));
}

export function mergeGiftCardDeliveryModifiers(
  modifiers: CartModifierSelection[] | undefined,
  delivery: GiftCardDelivery | null,
): CartModifierSelection[] {
  const rest = stripGiftCardDeliveryModifiers(modifiers);
  if (!delivery) return rest;
  return [...rest, ...giftCardDeliveryModifiers(delivery)];
}

export function parseGiftCardDeliveryFromModifiers(
  modifiers: CartModifierSelection[] | undefined,
): Partial<GiftCardDelivery> {
  const result: Partial<GiftCardDelivery> = {};
  for (const row of modifiers ?? []) {
    if (row.groupId === GIFT_CARD_RECIPIENT_GROUP_ID) {
      result.recipientEmail = row.optionName || row.optionId;
    } else if (row.groupId === GIFT_CARD_FROM_GROUP_ID) {
      result.fromName = row.optionName || row.optionId;
    } else if (row.groupId === GIFT_CARD_MESSAGE_GROUP_ID) {
      result.message = row.optionName || row.optionId;
    }
  }
  return result;
}

export function giftCardCorporateGalleryImage(): {
  id: string;
  thumb_url: string;
  medium_url: string;
  full_url: string;
  sort_order: number;
  is_primary: boolean;
} {
  return {
    id: "gift-card-corporate",
    thumb_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    medium_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    full_url: GIFT_CARD_PUBLIC_IMAGE_PATH,
    sort_order: 0,
    is_primary: true,
  };
}
