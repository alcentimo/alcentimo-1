"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { buildAuthConfirmUrl } from "@/lib/email/build-auth-action-url";
import { buildAccountVerificationPageUrl } from "@/lib/email/build-account-verification-url";
import {
  sendEmailChangeConfirmationEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/lib/email/send-auth-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { formatAuthError } from "@/lib/auth/format-auth-error";

const RESET_PASSWORD_NEXT = "/dashboard/restablecer-contrasena";

export const PENDING_CONFIRMATION_RESENT_MESSAGE =
  "Ya registramos una cuenta con este correo pero aún falta verificarla. Te hemos enviado un nuevo enlace de activación.";

export type AuthEmailActionResult =
  | { ok: true; resentPendingConfirmation?: boolean; notice?: string }
  | { ok: false; error: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapSignupError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return message;
}

function isAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") &&
    (lower.includes("registered") ||
      lower.includes("exists") ||
      lower.includes("duplicate"))
  );
}

function buildRedirectUrl(nextPath: string): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/onboarding";
  return `${siteUrl}${safeNext}`;
}

function extractLinkProperties(
  properties: {
    hashed_token?: string | null;
    email_otp?: string | null;
  } | null | undefined,
): { tokenHash: string | null; emailOtp: string | null } {
  const tokenHash = properties?.hashed_token?.trim() || null;
  const emailOtp = properties?.email_otp?.trim() || null;
  return { tokenHash, emailOtp };
}

function isValidVerificationCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const normalized = normalizeEmail(email);
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => normalizeEmail(user.email ?? "") === normalized,
    );
    if (match) return match;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function generateAuthLink(input: {
  type: "signup" | "recovery" | "magiclink" | "invite";
  email: string;
  password?: string;
  redirectTo?: string;
}) {
  const admin = createAdminClient();

  if (input.type === "signup") {
    return admin.auth.admin.generateLink({
      type: "signup",
      email: input.email,
      password: input.password ?? "",
      options: input.redirectTo ? { redirectTo: input.redirectTo } : undefined,
    });
  }

  if (input.type === "invite") {
    return admin.auth.admin.generateLink({
      type: "invite",
      email: input.email,
      options: input.redirectTo ? { redirectTo: input.redirectTo } : undefined,
    });
  }

  return admin.auth.admin.generateLink({
    type: input.type,
    email: input.email,
    options: input.redirectTo ? { redirectTo: input.redirectTo } : undefined,
  });
}

async function deliverSignupConfirmationEmail(input: {
  email: string;
  postAuthPath: string;
  tokenHash: string;
  emailOtp: string | null;
  otpType: EmailOtpType;
}): Promise<AuthEmailActionResult> {
  const actionUrl = buildAuthConfirmUrl({
    tokenHash: input.tokenHash,
    type: input.otpType,
    next: input.postAuthPath,
  });

  const manualVerificationUrl = buildAccountVerificationPageUrl({
    email: input.email,
    next: input.postAuthPath,
  });

  return sendAuthEmailForType({
    type: "signup",
    email: input.email,
    actionUrl,
    verificationCode: input.emailOtp,
    manualVerificationUrl,
  });
}

async function resendConfirmationForPendingUser(input: {
  email: string;
  password: string;
  postAuthPath: string;
}): Promise<AuthEmailActionResult> {
  const admin = createAdminClient();
  const existingUser = await findUserByEmail(admin, input.email);

  if (!existingUser) {
    return {
      ok: false,
      error:
        "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
    };
  }

  if (existingUser.email_confirmed_at) {
    return {
      ok: false,
      error:
        "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.",
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existingUser.id,
    { password: input.password },
  );

  if (updateError) {
    return { ok: false, error: mapSignupError(updateError.message) };
  }

  const { data, error } = await generateAuthLink({
    type: "invite",
    email: input.email,
    redirectTo: buildRedirectUrl(input.postAuthPath),
  });

  if (error) {
    return { ok: false, error: mapSignupError(error.message) };
  }

  const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
  if (!tokenHash) {
    return { ok: false, error: "No se pudo generar el enlace de confirmación." };
  }

  const emailResult = await deliverSignupConfirmationEmail({
    email: input.email,
    postAuthPath: input.postAuthPath,
    tokenHash,
    emailOtp,
    otpType: "invite",
  });

  if (!emailResult.ok) {
    return emailResult;
  }

  return {
    ok: true,
    resentPendingConfirmation: true,
    notice: PENDING_CONFIRMATION_RESENT_MESSAGE,
  };
}

async function sendAuthEmailForType(input: {
  type: EmailOtpType;
  email: string;
  actionUrl: string;
  verificationCode?: string | null;
  manualVerificationUrl?: string;
}): Promise<AuthEmailActionResult> {
  let result: Awaited<ReturnType<typeof sendSignupConfirmationEmail>>;

  switch (input.type) {
    case "signup":
    case "invite":
      result = await sendSignupConfirmationEmail({
        to: input.email,
        actionUrl: input.actionUrl,
        verificationCode: input.verificationCode ?? undefined,
        manualVerificationUrl: input.manualVerificationUrl,
      });
      break;
    case "recovery":
      result = await sendPasswordResetEmail({
        to: input.email,
        actionUrl: input.actionUrl,
        verificationCode: input.verificationCode ?? undefined,
      });
      break;
    case "magiclink":
      result = await sendMagicLinkEmail({
        to: input.email,
        actionUrl: input.actionUrl,
      });
      break;
    case "email_change":
    case "email":
      result = await sendEmailChangeConfirmationEmail({
        to: input.email,
        actionUrl: input.actionUrl,
      });
      break;
    default:
      result = await sendSignupConfirmationEmail({
        to: input.email,
        actionUrl: input.actionUrl,
      });
  }

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}

export async function signUpWithConfirmationEmailAction(input: {
  email: string;
  password: string;
  nextPath?: string | null;
}): Promise<AuthEmailActionResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }
  if (!input.password || input.password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const postAuthPath = resolvePostAuthPath(input.nextPath);

  try {
    const { data, error } = await generateAuthLink({
      type: "signup",
      email,
      password: input.password,
      redirectTo: buildRedirectUrl(postAuthPath),
    });

    if (error) {
      if (isAlreadyRegisteredError(error.message)) {
        return resendConfirmationForPendingUser({
          email,
          password: input.password,
          postAuthPath,
        });
      }

      return { ok: false, error: mapSignupError(error.message) };
    }

    const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
    if (!tokenHash) {
      return { ok: false, error: "No se pudo generar el enlace de confirmación." };
    }

    return deliverSignupConfirmationEmail({
      email,
      postAuthPath,
      tokenHash,
      emailOtp,
      otpType: "signup",
    });
  } catch (error) {
    console.error("[signUpWithConfirmationEmailAction]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo completar el registro.",
    };
  }
}

export async function sendPasswordResetEmailAction(input: {
  email: string;
}): Promise<AuthEmailActionResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  try {
    const redirectTo = getPasswordResetRedirectUrl();
    const { data, error } = await generateAuthLink({
      type: "recovery",
      email,
      redirectTo,
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("not found") ||
        lower.includes("no user") ||
        lower.includes("user not found")
      ) {
        return { ok: true };
      }
      return { ok: false, error: error.message };
    }

    const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
    if (!tokenHash) {
      return { ok: true };
    }

    const actionUrl = buildAuthConfirmUrl({
      tokenHash,
      type: "recovery",
      next: RESET_PASSWORD_NEXT,
    });

    const emailResult = await sendPasswordResetEmail({
      to: email,
      actionUrl,
      verificationCode: emailOtp ?? undefined,
    });

    if (!emailResult.ok) {
      return { ok: false, error: emailResult.error };
    }

    return { ok: true };
  } catch (error) {
    console.error("[sendPasswordResetEmailAction]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo enviar el correo de recuperación.",
    };
  }
}

export async function sendMagicLinkEmailAction(input: {
  email: string;
  nextPath?: string | null;
}): Promise<AuthEmailActionResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  const postAuthPath = resolvePostAuthPath(input.nextPath);

  try {
    const { data, error } = await generateAuthLink({
      type: "magiclink",
      email,
      redirectTo: buildRedirectUrl(postAuthPath),
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("not found") ||
        lower.includes("no user") ||
        lower.includes("user not found")
      ) {
        return { ok: true };
      }
      return { ok: false, error: error.message };
    }

    const { tokenHash } = extractLinkProperties(data?.properties);
    if (!tokenHash) {
      return { ok: true };
    }

    const actionUrl = buildAuthConfirmUrl({
      tokenHash,
      type: "magiclink",
      next: postAuthPath,
    });

    return sendAuthEmailForType({
      type: "magiclink",
      email,
      actionUrl,
    });
  } catch (error) {
    console.error("[sendMagicLinkEmailAction]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo enviar el enlace de acceso.",
    };
  }
}

export async function verifySignupOtpAction(input: {
  email: string;
  token: string;
}): Promise<AuthEmailActionResult> {
  const email = normalizeEmail(input.email);
  const token = input.token.trim();

  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (!isValidVerificationCode(token)) {
    return { ok: false, error: "Introduce el código de 6 dígitos del correo." };
  }

  try {
    const supabase = await createClient();
    const otpTypes: EmailOtpType[] = ["signup", "invite"];
    let lastError: Error | null = null;

    for (const type of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });

      if (!error) {
        return { ok: true };
      }

      lastError = error;
    }

    return {
      ok: false,
      error: formatAuthError(lastError?.message ?? "No se pudo verificar el código."),
    };
  } catch (error) {
    console.error("[verifySignupOtpAction]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo verificar el código.",
    };
  }
}
