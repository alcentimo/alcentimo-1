import { sendEmail, type SendEmailResult } from "@/lib/email/send-email";
import {
  AUTH_EMAIL_SUBJECTS,
  buildEmailChangeEmail,
  buildMagicLinkEmail,
  buildPasswordResetEmail,
  buildSignupConfirmationEmail,
  type AuthEmailTemplateInput,
} from "@/lib/email/templates/auth-emails";

async function sendAuthTemplateEmail(
  to: string,
  subject: string,
  template: AuthEmailTemplateInput,
  build: (input: AuthEmailTemplateInput) => { html: string; text: string },
): Promise<SendEmailResult> {
  const { html, text } = build(template);
  return sendEmail({ to, subject, html, text });
}

export async function sendSignupConfirmationEmail(input: {
  to: string;
  actionUrl: string;
  verificationCode?: string;
  manualVerificationUrl?: string;
}): Promise<SendEmailResult> {
  return sendAuthTemplateEmail(
    input.to,
    AUTH_EMAIL_SUBJECTS.signup,
    {
      actionUrl: input.actionUrl,
      verificationCode: input.verificationCode,
      manualVerificationUrl: input.manualVerificationUrl,
    },
    buildSignupConfirmationEmail,
  );
}

export async function sendPasswordResetEmail(input: {
  to: string;
  actionUrl: string;
}): Promise<SendEmailResult> {
  return sendAuthTemplateEmail(
    input.to,
    AUTH_EMAIL_SUBJECTS.recovery,
    {
      actionUrl: input.actionUrl,
    },
    buildPasswordResetEmail,
  );
}

export async function sendMagicLinkEmail(input: {
  to: string;
  actionUrl: string;
}): Promise<SendEmailResult> {
  return sendAuthTemplateEmail(
    input.to,
    AUTH_EMAIL_SUBJECTS.magiclink,
    { actionUrl: input.actionUrl },
    buildMagicLinkEmail,
  );
}

export async function sendEmailChangeConfirmationEmail(input: {
  to: string;
  actionUrl: string;
}): Promise<SendEmailResult> {
  return sendAuthTemplateEmail(
    input.to,
    AUTH_EMAIL_SUBJECTS.emailChange,
    { actionUrl: input.actionUrl },
    buildEmailChangeEmail,
  );
}
