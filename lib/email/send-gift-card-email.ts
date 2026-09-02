import { escapeHtml } from "@/lib/email/escape-html";
import { sendEmail } from "@/lib/email/send-email";
import { formatUsd } from "@/lib/format";

export async function sendGiftCardRecipientEmail(input: {
  to: string;
  storeName: string;
  amountUsd: number;
  code: string;
  fromName?: string | null;
  message?: string | null;
  redeemUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeName = input.storeName.trim() || "la tienda";
  const code = input.code.trim().toUpperCase();
  const fromName = input.fromName?.trim() || null;
  const message = input.message?.trim() || null;
  const amount = formatUsd(input.amountUsd);

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18181b;max-width:560px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#71717a;letter-spacing:0.08em;text-transform:uppercase;">Tarjeta de regalo</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Recibiste ${escapeHtml(amount)} para ${escapeHtml(storeName)}</h1>
      ${
        fromName
          ? `<p style="margin:0 0 12px;">De parte de <strong>${escapeHtml(fromName)}</strong>.</p>`
          : ""
      }
      ${
        message
          ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f4f4f5;border-radius:8px;">${escapeHtml(message)}</p>`
          : ""
      }
      <p style="margin:0 0 8px;">Tu código:</p>
      <p style="margin:0 0 20px;font-size:22px;letter-spacing:0.12em;font-weight:700;">${escapeHtml(code)}</p>
      <p style="margin:0 0 20px;">Inicia sesión en tu perfil de ${escapeHtml(storeName)} y abona el código para usarlo en tu próxima compra.</p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.redeemUrl)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
          Abonar a mi perfil
        </a>
      </p>
    </div>
  `.trim();

  const text = [
    `Recibiste ${amount} en tarjeta de regalo de ${storeName}.`,
    fromName ? `De parte de: ${fromName}` : null,
    message ? `Mensaje: ${message}` : null,
    `Código: ${code}`,
    `Abónalo en tu perfil: ${input.redeemUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return sendEmail({
    to: input.to,
    subject: `${fromName ? `${fromName} te envió` : "Recibiste"} una tarjeta de regalo de ${storeName}`,
    html,
    text,
  });
}
