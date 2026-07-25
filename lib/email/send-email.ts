import { ALCENTIMO_FROM } from "@/lib/email/constants";
import { getResendApiKey } from "@/lib/env/server";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

function formatSendFailure(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo enviar el correo.";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const apiKey = getResendApiKey();
    if (!apiKey) {
      return { ok: false, error: "RESEND_API_KEY no está configurada." };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: ALCENTIMO_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      return {
        ok: false,
        error: error.message || "No se pudo enviar el correo.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[sendEmail]", error);
    return { ok: false, error: formatSendFailure(error) };
  }
}
