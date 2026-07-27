import { ALCENTIMO_BRAND_COLOR } from "@/lib/email/constants";
import { escapeHtml } from "@/lib/email/escape-html";

export interface TransactionalEmailContent {
  preheader?: string;
  title: string;
  paragraphs: string[];
  actionLabel: string;
  actionUrl: string;
  verificationCode?: string;
  verificationCodeHint?: string;
  footerNote?: string;
}

export function buildTransactionalEmailHtml(
  input: TransactionalEmailContent,
): string {
  const title = escapeHtml(input.title);
  const actionUrl = escapeHtml(input.actionUrl);
  const actionLabel = escapeHtml(input.actionLabel);
  const preheader = input.preheader ? escapeHtml(input.preheader) : title;
  const paragraphs = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${paragraph}</p>`,
    )
    .join("");
  const footerNote = input.footerNote
    ? `<p style="margin:24px 0 0;font-size:12px;color:#71717a;line-height:1.5;">${escapeHtml(input.footerNote)}</p>`
    : "";
  const verificationBlock = input.verificationCode
    ? `<div style="margin:0 0 24px;padding:16px 20px;background:#f4f4f5;border-radius:10px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#71717a;">${escapeHtml(input.verificationCodeHint ?? "O introduce este código de verificación:")}</p>
        <p style="margin:0;font-size:30px;font-weight:700;letter-spacing:0.28em;color:#18181b;font-family:Consolas,Monaco,monospace;">${escapeHtml(input.verificationCode)}</p>
      </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;">
        <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px 0;">
                    <p style="margin:0 0 20px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;">Alcentimo</p>
                    <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#18181b;font-family:Arial,sans-serif;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px;font-family:Arial,sans-serif;line-height:1.6;">
                    ${paragraphs}
                    <p style="margin:0 0 28px;">
                      <a href="${actionUrl}" style="display:inline-block;background:${ALCENTIMO_BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;">
                        ${actionLabel}
                      </a>
                    </p>
                    ${verificationBlock}
                    <p style="margin:0 0 8px;font-size:12px;color:#71717a;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="margin:0 0 24px;font-size:12px;word-break:break-all;">
                      <a href="${actionUrl}" style="color:${ALCENTIMO_BRAND_COLOR};text-decoration:none;">${actionUrl}</a>
                    </p>
                    ${footerNote}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 24px;border-top:1px solid #f4f4f5;font-family:Arial,sans-serif;">
                    <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                      Este mensaje fue enviado por Alcentimo. Si no solicitaste esta acción, puedes ignorar este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}

export function buildTransactionalEmailText(
  input: TransactionalEmailContent,
): string {
  return [
    input.title,
    "",
    ...input.paragraphs.map((paragraph) =>
      paragraph.replace(/<[^>]+>/g, ""),
    ),
    "",
    `${input.actionLabel}: ${input.actionUrl}`,
    input.verificationCode
      ? `${input.verificationCodeHint ?? "Código de verificación:"} ${input.verificationCode}`
      : null,
    input.footerNote ?? null,
    "",
    "Este mensaje fue enviado por Alcentimo. Si no solicitaste esta acción, puedes ignorar este correo.",
  ]
    .filter(Boolean)
    .join("\n");
}
