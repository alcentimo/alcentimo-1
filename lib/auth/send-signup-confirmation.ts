import type { EmailOtpType } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAuthConfirmUrl } from "@/lib/email/build-auth-action-url";
import { buildAccountVerificationPageUrl } from "@/lib/email/build-account-verification-url";
import { sendSignupConfirmationEmail } from "@/lib/email/send-auth-email";
import { recordInitialVerificationEmailSent } from "@/lib/auth/verification-resend-limits";
import { getSiteUrl } from "@/lib/site-url";

function buildRedirectUrl(nextPath: string): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/onboarding";
  return `${siteUrl}${safeNext}`;
}

/**
 * Envía correo de confirmación de cuenta (enlace + OTP) sin abrir sesión.
 * Usado por registro de proveedores y refuerzo de tiendas.
 */
export async function sendSignupConfirmationEmailForPath(input: {
  email: string;
  password?: string;
  postAuthPath: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const postAuthPath = input.postAuthPath.trim() || "/onboarding";
  const redirectTo = buildRedirectUrl(postAuthPath);
  const admin = createAdminClient();

  const attempts: Array<{
    type: "signup" | "invite" | "magiclink";
    password?: string;
  }> = [
    ...(input.password
      ? [{ type: "signup" as const, password: input.password }]
      : []),
    { type: "magiclink" },
    { type: "invite" },
  ];

  let tokenHash: string | null = null;
  let emailOtp: string | null = null;
  let otpType: EmailOtpType = "signup";

  for (const attempt of attempts) {
    // Separar por tipo: GenerateLinkParams es un union discriminado estricto.
    const linkResult =
      attempt.type === "signup"
        ? await admin.auth.admin.generateLink({
            type: "signup",
            email,
            password: attempt.password ?? "",
            options: { redirectTo },
          })
        : attempt.type === "invite"
          ? await admin.auth.admin.generateLink({
              type: "invite",
              email,
              options: { redirectTo },
            })
          : await admin.auth.admin.generateLink({
              type: "magiclink",
              email,
              options: { redirectTo },
            });

    if (linkResult.error) continue;

    const hash = linkResult.data.properties?.hashed_token?.trim() || null;
    if (!hash) continue;

    tokenHash = hash;
    emailOtp = linkResult.data.properties?.email_otp?.trim() || null;
    otpType = attempt.type === "signup" ? "signup" : attempt.type;
    break;
  }

  if (!tokenHash) {
    return {
      ok: false,
      error:
        "No se pudo generar el enlace de confirmación. Intenta de nuevo en un momento.",
    };
  }

  const actionUrl = buildAuthConfirmUrl({
    tokenHash,
    type: otpType,
    next: postAuthPath,
  });
  const manualVerificationUrl = buildAccountVerificationPageUrl({
    email,
    next: postAuthPath,
  });

  const delivered = await sendSignupConfirmationEmail({
    to: email,
    actionUrl,
    verificationCode: emailOtp ?? undefined,
    manualVerificationUrl,
  });

  if (!delivered.ok) {
    return {
      ok: false,
      error:
        "error" in delivered && delivered.error
          ? delivered.error
          : "No pudimos enviar el correo de confirmación. Intenta de nuevo.",
    };
  }

  await recordInitialVerificationEmailSent(email);
  return { ok: true };
}
