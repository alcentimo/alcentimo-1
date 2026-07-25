import {
  buildTransactionalEmailHtml,
  buildTransactionalEmailText,
  type TransactionalEmailContent,
} from "@/lib/email/layout";

export interface AuthEmailTemplateInput {
  actionUrl: string;
}

function renderAuthEmail(
  content: TransactionalEmailContent,
): { html: string; text: string } {
  return {
    html: buildTransactionalEmailHtml(content),
    text: buildTransactionalEmailText(content),
  };
}

export function buildSignupConfirmationEmail(input: AuthEmailTemplateInput) {
  return renderAuthEmail({
    preheader: "Confirma tu correo para activar tu cuenta en Alcentimo.",
    title: "Confirma tu cuenta",
    paragraphs: [
      "Gracias por registrarte en Alcentimo.",
      "Para activar tu cuenta y acceder al panel de administración, confirma tu correo con el botón de abajo.",
    ],
    actionLabel: "Confirmar mi cuenta",
    actionUrl: input.actionUrl,
    footerNote:
      "Este enlace expira por seguridad. Si caduca, vuelve a registrarte o solicita un nuevo correo de confirmación.",
  });
}

export function buildPasswordResetEmail(input: AuthEmailTemplateInput) {
  return renderAuthEmail({
    preheader: "Restablece tu contraseña de Alcentimo.",
    title: "Restablece tu contraseña",
    paragraphs: [
      "Recibimos una solicitud para cambiar la contraseña de tu cuenta.",
      "Si fuiste tú, usa el botón de abajo para crear una nueva contraseña.",
    ],
    actionLabel: "Crear nueva contraseña",
    actionUrl: input.actionUrl,
    footerNote:
      "El enlace expira después de un tiempo por seguridad. Si no solicitaste este cambio, ignora este correo.",
  });
}

export function buildMagicLinkEmail(input: AuthEmailTemplateInput) {
  return renderAuthEmail({
    preheader: "Tu enlace de acceso a Alcentimo.",
    title: "Accede a tu cuenta",
    paragraphs: [
      "Usa el botón de abajo para iniciar sesión en Alcentimo sin contraseña.",
      "Por tu seguridad, este enlace solo funciona una vez.",
    ],
    actionLabel: "Iniciar sesión",
    actionUrl: input.actionUrl,
    footerNote: "Si no solicitaste este acceso, puedes ignorar este mensaje.",
  });
}

export function buildEmailChangeEmail(input: AuthEmailTemplateInput) {
  return renderAuthEmail({
    preheader: "Confirma el cambio de correo en Alcentimo.",
    title: "Confirma tu nuevo correo",
    paragraphs: [
      "Solicitaste cambiar el correo de tu cuenta en Alcentimo.",
      "Confirma el nuevo correo con el botón de abajo para completar el cambio.",
    ],
    actionLabel: "Confirmar nuevo correo",
    actionUrl: input.actionUrl,
    footerNote:
      "Si no reconoces esta solicitud, ignora este correo y revisa la seguridad de tu cuenta.",
  });
}

export const AUTH_EMAIL_SUBJECTS = {
  signup: "Confirma tu cuenta en Alcentimo",
  recovery: "Restablece tu contraseña en Alcentimo",
  magiclink: "Tu enlace de acceso a Alcentimo",
  emailChange: "Confirma tu nuevo correo en Alcentimo",
} as const;
