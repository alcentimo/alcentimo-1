import { getResendApiKey } from "@/lib/env/server";

const TEAM_INVITATION_FROM = "no-reply@alcentimo.com";

export interface SendTeamInvitationEmailInput {
  to: string;
  storeName: string;
  roleLabel: string;
  inviteUrl: string;
  inviterEmail?: string | null;
  expiresInDays: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTeamInvitationHtml(input: SendTeamInvitationEmailInput): string {
  const storeName = escapeHtml(input.storeName);
  const roleLabel = escapeHtml(input.roleLabel);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const inviter = input.inviterEmail?.trim()
    ? escapeHtml(input.inviterEmail.trim())
    : null;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#18181b;max-width:560px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 12px;font-size:14px;color:#52525b;">Alcentimo</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Te invitaron al equipo de ${storeName}</h1>
      <p style="margin:0 0 12px;">
        ${inviter ? `<strong>${inviter}</strong> te invitó` : "Te invitaron"} a colaborar en el panel de administración como <strong>${roleLabel}</strong>.
      </p>
      <p style="margin:0 0 20px;">
        Acepta la invitación con el mismo correo al que llegó este mensaje. El enlace vence en ${input.expiresInDays} días.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${inviteUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
          Unirme al equipo
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#71717a;word-break:break-all;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
        <a href="${inviteUrl}" style="color:#0d9488;">${inviteUrl}</a>
      </p>
    </div>
  `.trim();
}

function formatEmailFailure(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo enviar el correo de invitación.";
}

export async function sendTeamInvitationEmail(
  input: SendTeamInvitationEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const apiKey = getResendApiKey();
    if (!apiKey) {
      return { ok: false, error: "RESEND_API_KEY no está configurada." };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const subject = `Invitación al equipo de ${input.storeName}`;

    const { error } = await resend.emails.send({
      from: `Alcentimo <${TEAM_INVITATION_FROM}>`,
      to: input.to,
      subject,
      html: buildTeamInvitationHtml(input),
      text: [
        `Te invitaron al equipo de ${input.storeName} como ${input.roleLabel}.`,
        input.inviterEmail ? `Invitado por: ${input.inviterEmail}` : null,
        `Acepta la invitación aquí: ${input.inviteUrl}`,
        `El enlace vence en ${input.expiresInDays} días.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    if (error) {
      return {
        ok: false,
        error: error.message || "No se pudo enviar el correo de invitación.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[sendTeamInvitationEmail]", error);
    return { ok: false, error: formatEmailFailure(error) };
  }
}
