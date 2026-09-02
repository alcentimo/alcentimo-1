import "server-only";

import { sendEmail } from "@/lib/email/send-email";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildTransactionalEmailHtml,
  buildTransactionalEmailText,
} from "@/lib/email/layout";
import { formatUsd } from "@/lib/format";
import type { GiftCardDelivery } from "@/lib/gift-cards/delivery";

export async function sendPurchasedGiftCardEmail(input: {
  storeName: string;
  profileUrl: string;
  amountUsd: number;
  codes: string[];
  delivery: GiftCardDelivery;
}): Promise<void> {
  const codesLabel = input.codes.join(", ");
  const amount = formatUsd(input.amountUsd);
  const paragraphs = [
    escapeHtml(
      `${input.delivery.fromName} te envió una tarjeta de regalo de ${input.storeName} por ${amount}.`,
    ),
    `<em>${escapeHtml(input.delivery.message)}</em>`,
    escapeHtml(
      input.codes.length > 1
        ? "Usa estos códigos en Mi perfil para abonar el saldo a tu cuenta:"
        : "Usa este código en Mi perfil para abonar el saldo a tu cuenta:",
    ),
  ];

  const content = {
    preheader: `Tarjeta de regalo de ${input.storeName}: ${amount}`,
    title: "Recibiste una tarjeta de regalo",
    paragraphs,
    actionLabel: "Abonar en mi perfil",
    actionUrl: input.profileUrl,
    verificationCode: codesLabel,
    verificationCodeHint:
      input.codes.length > 1 ? "Tus códigos:" : "Tu código:",
    footerNote:
      "El código es de un solo uso para cargar saldo. Si no esperabas este correo, puedes ignorarlo.",
  };

  const result = await sendEmail({
    to: input.delivery.recipientEmail,
    subject: `${input.delivery.fromName} te envió una tarjeta de regalo de ${input.storeName}`,
    html: buildTransactionalEmailHtml(content),
    text: buildTransactionalEmailText({
      ...content,
      paragraphs: [
        `${input.delivery.fromName} te envió una tarjeta de regalo de ${input.storeName} por ${amount}.`,
        input.delivery.message,
        input.codes.length > 1
          ? "Usa estos códigos en Mi perfil para abonar el saldo a tu cuenta:"
          : "Usa este código en Mi perfil para abonar el saldo a tu cuenta:",
      ],
    }),
  });

  if (!result.ok) {
    console.error("[gift-card-email]", result.error);
  }
}
