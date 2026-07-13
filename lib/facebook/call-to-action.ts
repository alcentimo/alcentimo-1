export type FacebookPostCallToAction = "none" | "message" | "shop" | "learn_more";

export interface FacebookCallToActionOption {
  value: FacebookPostCallToAction;
  label: string;
}

export const FACEBOOK_CTA_OPTIONS: FacebookCallToActionOption[] = [
  { value: "none", label: "Sin botón" },
  { value: "message", label: "Enviar mensaje" },
  { value: "shop", label: "Comprar ahora" },
  { value: "learn_more", label: "Más información" },
];

const META_CTA_TYPES: Record<
  Exclude<FacebookPostCallToAction, "none">,
  string
> = {
  message: "MESSAGE_PAGE",
  shop: "SHOP_NOW",
  learn_more: "LEARN_MORE",
};

export function buildMetaCallToActionPayload(
  callToAction: FacebookPostCallToAction,
  options: { pageId: string; actionLink?: string },
): Record<string, unknown> | null {
  if (callToAction === "none") return null;

  const type = META_CTA_TYPES[callToAction];
  const link =
    callToAction === "message"
      ? `https://m.me/${options.pageId}`
      : options.actionLink?.trim();

  if (!link) return { type };

  return {
    type,
    value: { link },
  };
}
