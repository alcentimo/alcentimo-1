"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { buildAuthConfirmUrl } from "@/lib/email/build-auth-action-url";
import {
  sendEmailChangeConfirmationEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/lib/email/send-auth-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { getSiteUrl } from "@/lib/site-url";

const RESET_PASSWORD_NEXT = "/dashboard/restablecer-contrasena";

export type AuthEmailActionResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapSignupError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered")) {
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  }
  if (lower.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return message;
}

function buildRedirectUrl(nextPath: string): string {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const safeNext =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/onboarding";
  return `${siteUrl}${safeNext}`;
}

function extractTokenHash(properties: {
  hashed_token?: string | null;
} | null | undefined): string | null {
  const tokenHash = properties?.hashed_token?.trim();
  return tokenHash || null;
}

async function generateAuthLink(input: {
  type: "signup" | "recovery" | "magiclink";
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

  return admin.auth.admin.generateLink({
    type: input.type,
    email: input.email,
    options: input.redirectTo ? { redirectTo: input.redirectTo } : undefined,
  });
}

async function sendAuthEmailForType(input: {
  type: EmailOtpType;
  email: string;
  actionUrl: string;
}): Promise<AuthEmailActionResult> {
  let result: Awaited<ReturnType<typeof sendSignupConfirmationEmail>>;

  switch (input.type) {
    case "signup":
    case "invite":
      result = await sendSignupConfirmationEmail({
        to: input.email,
        actionUrl: input.actionUrl,
      });
      break;
    case "recovery":
      result = await sendPasswordResetEmail({
        to: input.email,
        actionUrl: input.actionUrl,
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
      return { ok: false, error: mapSignupError(error.message) };
    }

    const tokenHash = extractTokenHash(data?.properties);
    if (!tokenHash) {
      return { ok: false, error: "No se pudo generar el enlace de confirmación." };
    }

    const actionUrl = buildAuthConfirmUrl({
      tokenHash,
      type: "signup",
      next: postAuthPath,
    });

    return sendAuthEmailForType({
      type: "signup",
      email,
      actionUrl,
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

    const tokenHash = extractTokenHash(data?.properties);
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

    const tokenHash = extractTokenHash(data?.properties);
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
