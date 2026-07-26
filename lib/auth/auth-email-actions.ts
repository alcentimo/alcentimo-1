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
import {
  PENDING_CONFIRMATION_RESENT_MESSAGE,
  type AuthEmailActionResult,
} from "@/lib/auth/auth-email-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { formatAuthError } from "@/lib/auth/format-auth-error";

const RESET_PASSWORD_NEXT = "/dashboard/restablecer-contrasena";

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

const EXISTING_CONFIRMED_ACCOUNT_ERROR =
  "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";

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

function isEmailConfirmed(user: User): boolean {
  return Boolean(user.email_confirmed_at);
}

/**
 * Busca un usuario por email vía Admin API (filtro directo + fallback paginado).
 */
async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (url && serviceRoleKey) {
    const endpoint = new URL(`${url}/auth/v1/admin/users`);
    endpoint.searchParams.set("page", "1");
    endpoint.searchParams.set("per_page", "50");
    endpoint.searchParams.set("email", normalized);

    try {
      const response = await fetch(endpoint.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const payload = (await response.json()) as
          | { users?: User[] }
          | User[];
        const users = Array.isArray(payload) ? payload : (payload.users ?? []);
        const match = users.find(
          (user) => normalizeEmail(user.email ?? "") === normalized,
        );
        if (match) return match;
      }
    } catch (error) {
      console.warn("[findUserByEmail] admin email filter failed", error);
    }
  }

  const admin = createAdminClient();
  let page = 1;

  while (page <= 50) {
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

async function generatePendingConfirmationLink(input: {
  email: string;
  password: string;
  redirectTo: string;
}): Promise<{
  tokenHash: string;
  emailOtp: string | null;
  otpType: EmailOtpType;
} | { error: string }> {
  const redirectTo = input.redirectTo;

  // 1) Intentar enlace de signup (algunos entornos lo regeneran si aún no confirmó).
  {
    const { data, error } = await generateAuthLink({
      type: "signup",
      email: input.email,
      password: input.password,
      redirectTo,
    });
    if (!error) {
      const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
      if (tokenHash) {
        return { tokenHash, emailOtp, otpType: "signup" };
      }
    }
  }

  // 2) Invite: genera token de activación para cuenta existente pendiente.
  {
    const { data, error } = await generateAuthLink({
      type: "invite",
      email: input.email,
      redirectTo,
    });
    if (!error) {
      const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
      if (tokenHash) {
        return { tokenHash, emailOtp, otpType: "invite" };
      }
    }
  }

  // 3) Magic link como último recurso (sigue enviándose con plantilla de confirmación).
  {
    const { data, error } = await generateAuthLink({
      type: "magiclink",
      email: input.email,
      redirectTo,
    });
    if (!error) {
      const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
      if (tokenHash) {
        return { tokenHash, emailOtp, otpType: "magiclink" };
      }
    }
    if (error) {
      return { error: mapSignupError(error.message) };
    }
  }

  return { error: "No se pudo generar el enlace de confirmación." };
}

async function resendConfirmationForPendingUser(input: {
  email: string;
  password: string;
  postAuthPath: string;
  existingUser: User;
}): Promise<AuthEmailActionResult> {
  if (isEmailConfirmed(input.existingUser)) {
    return {
      ok: false,
      error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
    };
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin.auth.admin.updateUserById(
    input.existingUser.id,
    { password: input.password },
  );

  if (updateError) {
    return { ok: false, error: mapSignupError(updateError.message) };
  }

  const link = await generatePendingConfirmationLink({
    email: input.email,
    password: input.password,
    redirectTo: buildRedirectUrl(input.postAuthPath),
  });

  if ("error" in link) {
    return { ok: false, error: link.error };
  }

  // Siempre plantilla de confirmación de cuenta (nunca recuperación de contraseña).
  const emailResult = await deliverSignupConfirmationEmail({
    email: input.email,
    postAuthPath: input.postAuthPath,
    tokenHash: link.tokenHash,
    emailOtp: link.emailOtp,
    otpType: link.otpType === "magiclink" ? "magiclink" : link.otpType,
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
    // 1) Verificar primero si el correo ya existe en Supabase Auth.
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Solo bloquear si la cuenta ya fue confirmada.
      if (isEmailConfirmed(existingUser)) {
        return {
          ok: false,
          error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
        };
      }

      // Pendiente de verificación: reenviar activación (enlace + OTP).
      return resendConfirmationForPendingUser({
        email,
        password: input.password,
        postAuthPath,
        existingUser,
      });
    }

    // 2) Usuario nuevo: crear enlace de confirmación de signup.
    const { data, error } = await generateAuthLink({
      type: "signup",
      email,
      password: input.password,
      redirectTo: buildRedirectUrl(postAuthPath),
    });

    if (error) {
      // Carrera: el usuario pudo crearse entre la consulta y generateLink.
      const racedUser = await findUserByEmail(email);
      if (racedUser) {
        if (isEmailConfirmed(racedUser)) {
          return {
            ok: false,
            error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
          };
        }
        return resendConfirmationForPendingUser({
          email,
          password: input.password,
          postAuthPath,
          existingUser: racedUser,
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
    const otpTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "email"];
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
