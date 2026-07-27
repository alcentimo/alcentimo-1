"use server";

import type { AuthError, EmailOtpType, User } from "@supabase/supabase-js";
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
  EXISTING_CONFIRMED_ACCOUNT_MESSAGE,
  type AuthEmailActionResult,
  type VerificationResendActionResult,
  type VerificationResendStatusResult,
  type CorrectSignupEmailResult,
} from "@/lib/auth/auth-email-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { getSiteUrl } from "@/lib/site-url";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  assertVerificationResendAllowed,
  clearVerificationResendLimits,
  getVerificationResendStatus,
  recordInitialVerificationEmailSent,
  recordVerificationResendSuccess,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/verification-resend-limits";

const RESET_PASSWORD_NEXT = "/dashboard/restablecer-contrasena";

const EXISTING_CONFIRMED_ACCOUNT_ERROR = EXISTING_CONFIRMED_ACCOUNT_MESSAGE;

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
 * Detecta el rechazo de Supabase Auth por correo ya registrado
 * (mensaje o código), independientemente del lookup admin.
 */
function isAlreadyRegisteredAuthError(
  error: Pick<AuthError, "message" | "code" | "status"> | { message: string },
): boolean {
  const message = error.message.toLowerCase();
  const code =
    "code" in error && typeof error.code === "string"
      ? error.code.toLowerCase()
      : "";

  if (
    code.includes("email_exists") ||
    code.includes("user_already_exists") ||
    code.includes("already_exists")
  ) {
    return true;
  }

  return (
    (message.includes("already") &&
      (message.includes("registered") ||
        message.includes("exists") ||
        message.includes("duplicate"))) ||
    message.includes("user already exists") ||
    message.includes("email address is already")
  );
}

function pendingResentSuccess(): AuthEmailActionResult {
  return {
    ok: true,
    resentPendingConfirmation: true,
    notice: PENDING_CONFIRMATION_RESENT_MESSAGE,
  };
}

/**
 * Busca usuario por email con Admin API.
 * El filtro `?email=` de GoTrue no siempre filtra; por eso hay fallback paginado.
 */
async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (baseUrl && serviceRoleKey) {
    for (const [param, value] of [
      ["email", normalized],
      ["filter", normalized],
    ] as const) {
      try {
        const endpoint = new URL(`${baseUrl}/auth/v1/admin/users`);
        endpoint.searchParams.set("page", "1");
        endpoint.searchParams.set("per_page", "200");
        endpoint.searchParams.set(param, value);

        const response = await fetch(endpoint.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) continue;

        const payload = (await response.json()) as { users?: User[] } | User[];
        const users = Array.isArray(payload) ? payload : (payload.users ?? []);
        const match = users.find(
          (user) => normalizeEmail(user.email ?? "") === normalized,
        );
        if (match) return match;
      } catch (error) {
        console.warn(`[findUserByEmail] filter ${param} failed`, error);
      }
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
      console.error("[findUserByEmail] listUsers failed", error.message);
      break;
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

  // Siempre plantilla de confirmación de cuenta (nunca recovery).
  return sendAuthEmailForType({
    type: "signup",
    email: input.email,
    actionUrl,
    verificationCode: input.emailOtp,
    manualVerificationUrl,
  });
}

/**
 * Genera token de activación para un email que YA existe.
 * `signup`/`invite` suelen fallar si el usuario existe; `magiclink` sí funciona.
 */
async function generateActivationLinkForExistingEmail(input: {
  email: string;
  password: string;
  redirectTo: string;
}): Promise<{
  tokenHash: string;
  emailOtp: string | null;
  otpType: EmailOtpType;
} | null> {
  const attempts: Array<{
    type: "signup" | "invite" | "magiclink";
    password?: string;
  }> = [
    { type: "magiclink" },
    { type: "invite" },
    { type: "signup", password: input.password },
  ];

  for (const attempt of attempts) {
    const { data, error } = await generateAuthLink({
      type: attempt.type,
      email: input.email,
      password: attempt.password,
      redirectTo: input.redirectTo,
    });

    if (error) continue;

    const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
    if (!tokenHash) continue;

    return {
      tokenHash,
      emailOtp,
      otpType: attempt.type === "signup" ? "signup" : attempt.type,
    };
  }

  return null;
}

/**
 * Reenvía activación para cuenta existente no confirmada (o cuando Auth
 * ya reportó "already registered" y no pudimos leer email_confirmed_at).
 */
async function resendActivationForExistingEmail(input: {
  email: string;
  password: string;
  postAuthPath: string;
  existingUser?: User | null;
}): Promise<AuthEmailActionResult> {
  const admin = createAdminClient();
  const user = input.existingUser ?? (await findUserByEmail(input.email));

  // Único caso de bloqueo duro: confirmado de forma verificable.
  if (user && isEmailConfirmed(user)) {
    return {
      ok: false,
      error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
    };
  }

  if (user) {
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password: input.password },
    );
    if (updateError) {
      console.warn(
        "[resendActivationForExistingEmail] password update failed",
        updateError.message,
      );
    }
  }

  const redirectTo = buildRedirectUrl(input.postAuthPath);

  // 1) Preferido: generateLink + nuestro correo custom (enlace + OTP).
  const link = await generateActivationLinkForExistingEmail({
    email: input.email,
    password: input.password,
    redirectTo,
  });

  if (link) {
    const emailResult = await deliverSignupConfirmationEmail({
      email: input.email,
      postAuthPath: input.postAuthPath,
      tokenHash: link.tokenHash,
      emailOtp: link.emailOtp,
      otpType: link.otpType,
    });

    if (emailResult.ok) {
      await recordInitialVerificationEmailSent(input.email);
      return pendingResentSuccess();
    }

    console.error(
      "[resendActivationForExistingEmail] custom email failed",
      emailResult.ok === false ? emailResult.error : "unknown",
    );
  }

  // 2) Fallback: Auth.resend(signup) — dispara Send Email Hook / SMTP de Supabase.
  try {
    const supabase = await createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: input.email,
      options: { emailRedirectTo: redirectTo },
    });

    if (!resendError) {
      await recordInitialVerificationEmailSent(input.email);
      return pendingResentSuccess();
    }

    console.error(
      "[resendActivationForExistingEmail] auth.resend failed",
      resendError.message,
    );
  } catch (error) {
    console.error("[resendActivationForExistingEmail] auth.resend threw", error);
  }

  // Si Auth dijo que el correo existe pero no está confirmado (o no lo
  // pudimos leer) y falló el reenvío, no devolver el error crudo de duplicado.
  if (!user || !isEmailConfirmed(user)) {
    return {
      ok: false,
      error:
        "No pudimos reenviar el correo de activación ahora. Espera un minuto e inténtalo de nuevo, o revisa tu bandeja/spam.",
    };
  }

  return {
    ok: false,
    error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
  };
}

/**
 * Reenvía código/enlace de verificación sin contraseña (pantalla Confirma tu cuenta).
 */
async function resendVerificationEmailOnly(input: {
  email: string;
  postAuthPath: string;
}): Promise<AuthEmailActionResult> {
  const user = await findUserByEmail(input.email);

  if (user && isEmailConfirmed(user)) {
    return {
      ok: false,
      error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
    };
  }

  if (!user) {
    return {
      ok: false,
      error:
        "No encontramos una cuenta pendiente de verificación con ese correo.",
    };
  }

  const redirectTo = buildRedirectUrl(input.postAuthPath);

  const link = await generateActivationLinkForExistingEmail({
    email: input.email,
    password: "",
    redirectTo,
  });

  if (link) {
    const emailResult = await deliverSignupConfirmationEmail({
      email: input.email,
      postAuthPath: input.postAuthPath,
      tokenHash: link.tokenHash,
      emailOtp: link.emailOtp,
      otpType: link.otpType,
    });

    if (emailResult.ok) {
      return {
        ok: true,
        notice: PENDING_CONFIRMATION_RESENT_MESSAGE,
      };
    }

    console.error(
      "[resendVerificationEmailOnly] custom email failed",
      emailResult.ok === false ? emailResult.error : "unknown",
    );
  }

  try {
    const supabase = await createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: input.email,
      options: { emailRedirectTo: redirectTo },
    });

    if (!resendError) {
      return {
        ok: true,
        notice: PENDING_CONFIRMATION_RESENT_MESSAGE,
      };
    }

    console.error("[resendVerificationEmailOnly] auth.resend failed", resendError.message);
  } catch (error) {
    console.error("[resendVerificationEmailOnly] auth.resend threw", error);
  }

  return {
    ok: false,
    error:
      "No pudimos reenviar el correo ahora. Espera un momento e inténtalo de nuevo.",
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

type ClearUnconfirmedSignupStatus =
  | "cleared"
  | "not_found"
  | "already_confirmed"
  | "blocked_has_store"
  | "invalid_email";

interface ClearUnconfirmedSignupResult {
  status: ClearUnconfirmedSignupStatus;
  user_id: string | null;
}

/**
 * RPC SECURITY DEFINER: elimina el auth.users huérfano si
 * email_confirmed_at IS NULL (y no es dueño de tienda).
 */
async function clearUnconfirmedSignupViaRpc(
  email: string,
): Promise<ClearUnconfirmedSignupResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("clear_unconfirmed_signup", {
    p_email: email,
  });

  if (error) {
    console.error("[clearUnconfirmedSignupViaRpc]", error.message);
    throw error;
  }

  const payload = (data ?? {}) as Partial<ClearUnconfirmedSignupResult>;
  const status = payload.status;

  if (
    status === "cleared" ||
    status === "not_found" ||
    status === "already_confirmed" ||
    status === "blocked_has_store" ||
    status === "invalid_email"
  ) {
    return {
      status,
      user_id: typeof payload.user_id === "string" ? payload.user_id : null,
    };
  }

  return { status: "not_found", user_id: null };
}

async function createFreshSignupConfirmation(input: {
  email: string;
  password: string;
  postAuthPath: string;
  redirectTo: string;
  wasResent: boolean;
}): Promise<AuthEmailActionResult> {
  const { data, error } = await generateAuthLink({
    type: "signup",
    email: input.email,
    password: input.password,
    redirectTo: input.redirectTo,
  });

  if (error) {
    return { ok: false, error: mapSignupError(error.message) };
  }

  const { tokenHash, emailOtp } = extractLinkProperties(data?.properties);
  if (!tokenHash) {
    return { ok: false, error: "No se pudo generar el enlace de confirmación." };
  }

  const delivered = await deliverSignupConfirmationEmail({
    email: input.email,
    postAuthPath: input.postAuthPath,
    tokenHash,
    emailOtp,
    otpType: "signup",
  });

  if (!delivered.ok) {
    return delivered;
  }

  await recordInitialVerificationEmailSent(input.email);

  if (input.wasResent) {
    return {
      ok: true,
      resentPendingConfirmation: true,
      notice: PENDING_CONFIRMATION_RESENT_MESSAGE,
    };
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
  const redirectTo = buildRedirectUrl(postAuthPath);

  try {
    // 1) RPC: si hay cuenta sin confirmar, borrar el registro huérfano.
    let clearResult: ClearUnconfirmedSignupResult;
    try {
      clearResult = await clearUnconfirmedSignupViaRpc(email);
    } catch {
      // Si la migración aún no está aplicada, caer al flujo anterior.
      clearResult = { status: "not_found", user_id: null };
      const existingUser = await findUserByEmail(email);
      if (existingUser && isEmailConfirmed(existingUser)) {
        return { ok: false, error: EXISTING_CONFIRMED_ACCOUNT_ERROR };
      }
      if (existingUser && !isEmailConfirmed(existingUser)) {
        return resendActivationForExistingEmail({
          email,
          password: input.password,
          postAuthPath,
          existingUser,
        });
      }
    }

    if (clearResult.status === "already_confirmed") {
      return { ok: false, error: EXISTING_CONFIRMED_ACCOUNT_ERROR };
    }

    if (clearResult.status === "invalid_email") {
      return { ok: false, error: "Ingresa un correo válido." };
    }

    // Tiene tienda pero email sin confirmar: no borramos; reenviamos activación.
    if (clearResult.status === "blocked_has_store") {
      return resendActivationForExistingEmail({
        email,
        password: input.password,
        postAuthPath,
        existingUser: await findUserByEmail(email),
      });
    }

    const wasResent = clearResult.status === "cleared";

    // 2) Alta limpia (usuario nuevo o huérfano recién eliminado).
    let signupResult = await createFreshSignupConfirmation({
      email,
      password: input.password,
      postAuthPath,
      redirectTo,
      wasResent,
    });

    // 3) Si Auth aún reporta duplicado, limpiar otra vez y reintentar una vez.
    if (
      !signupResult.ok &&
      isAlreadyRegisteredAuthError({ message: signupResult.error })
    ) {
      const retryClear = await clearUnconfirmedSignupViaRpc(email).catch(
        () => null,
      );

      if (retryClear?.status === "already_confirmed") {
        return { ok: false, error: EXISTING_CONFIRMED_ACCOUNT_ERROR };
      }

      if (retryClear?.status === "cleared" || retryClear?.status === "not_found") {
        signupResult = await createFreshSignupConfirmation({
          email,
          password: input.password,
          postAuthPath,
          redirectTo,
          wasResent: true,
        });
      } else {
        return resendActivationForExistingEmail({
          email,
          password: input.password,
          postAuthPath,
          existingUser: await findUserByEmail(email),
        });
      }
    }

    return signupResult;
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

  const sendResult = await sendPasswordResetEmailOnly(email);
  if (!sendResult.ok) {
    return sendResult;
  }

  await recordInitialVerificationEmailSent(email, "recovery");
  return { ok: true };
}

async function sendPasswordResetEmailOnly(
  email: string,
): Promise<AuthEmailActionResult> {
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
    console.error("[sendPasswordResetEmailOnly]", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo enviar el correo de recuperación.",
    };
  }
}

export async function getPasswordRecoveryResendStatusAction(input: {
  email: string;
}): Promise<VerificationResendStatusResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return {
      ok: true,
      cooldownSeconds: 0,
      blockedSeconds: 0,
      resendsRemaining: 0,
      canResend: false,
    };
  }

  const status = await getVerificationResendStatus(email, "recovery");
  return {
    ok: true,
    cooldownSeconds: status.cooldownSeconds,
    blockedSeconds: status.blockedSeconds,
    resendsRemaining: status.resendsRemaining,
    canResend: status.canResend,
  };
}

export async function resendPasswordResetEmailAction(input: {
  email: string;
}): Promise<VerificationResendActionResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  const gate = await assertVerificationResendAllowed(email, "recovery");
  if (!gate.allowed) {
    return {
      ok: false,
      error: gate.message,
      cooldownSeconds:
        gate.reason === "cooldown" ? gate.secondsRemaining : undefined,
      blockedSeconds:
        gate.reason === "blocked" || gate.reason === "limit"
          ? gate.secondsRemaining
          : undefined,
      resendsRemaining: 0,
    };
  }

  const sendResult = await sendPasswordResetEmailOnly(email);
  if (!sendResult.ok) {
    return {
      ok: false,
      error: sendResult.error,
      resendsRemaining: gate.resendsRemaining,
    };
  }

  const limitStatus = await recordVerificationResendSuccess(email, "recovery");

  return {
    ok: true,
    notice: `Te enviamos un nuevo enlace de recuperación a ${email}. Revisa tu bandeja y la carpeta de spam.`,
    cooldownSeconds:
      limitStatus.cooldownSeconds || VERIFICATION_RESEND_COOLDOWN_SECONDS,
    blockedSeconds: limitStatus.blockedSeconds,
    resendsRemaining: limitStatus.resendsRemaining,
  };
}

export async function correctPasswordRecoveryEmailAction(input: {
  previousEmail: string;
  newEmail: string;
}): Promise<
  | {
      ok: true;
      email: string;
      notice: string;
    }
  | { ok: false; error: string }
> {
  const previousEmail = normalizeEmail(input.previousEmail);
  const newEmail = normalizeEmail(input.newEmail);

  if (!isValidEmail(previousEmail) || !isValidEmail(newEmail)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (previousEmail === newEmail) {
    return {
      ok: false,
      error: "El nuevo correo debe ser diferente al actual.",
    };
  }

  await clearVerificationResendLimits(previousEmail, "recovery");

  const sendResult = await sendPasswordResetEmailOnly(newEmail);
  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  await recordInitialVerificationEmailSent(newEmail, "recovery");

  return {
    ok: true,
    email: newEmail,
    notice: `Actualizamos el destino a ${newEmail} y enviamos un nuevo enlace de recuperación.`,
  };
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

export async function getSignupVerificationResendStatusAction(input: {
  email: string;
}): Promise<VerificationResendStatusResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return {
      ok: true,
      cooldownSeconds: 0,
      blockedSeconds: 0,
      resendsRemaining: 0,
      canResend: false,
    };
  }

  const status = await getVerificationResendStatus(email);
  return {
    ok: true,
    cooldownSeconds: status.cooldownSeconds,
    blockedSeconds: status.blockedSeconds,
    resendsRemaining: status.resendsRemaining,
    canResend: status.canResend,
  };
}

export async function resendSignupVerificationCodeAction(input: {
  email: string;
  nextPath?: string | null;
}): Promise<VerificationResendActionResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  const gate = await assertVerificationResendAllowed(email);
  if (!gate.allowed) {
    return {
      ok: false,
      error: gate.message,
      cooldownSeconds:
        gate.reason === "cooldown" ? gate.secondsRemaining : undefined,
      blockedSeconds:
        gate.reason === "blocked" || gate.reason === "limit"
          ? gate.secondsRemaining
          : undefined,
      resendsRemaining: 0,
    };
  }

  const postAuthPath = resolvePostAuthPath(input.nextPath);
  const sendResult = await resendVerificationEmailOnly({
    email,
    postAuthPath,
  });

  if (!sendResult.ok) {
    return {
      ok: false,
      error: sendResult.error,
      resendsRemaining: gate.resendsRemaining,
    };
  }

  const limitStatus = await recordVerificationResendSuccess(email);

  return {
    ok: true,
    notice: `Te enviamos un nuevo código de 6 dígitos a ${email}. Revisa tu bandeja y la carpeta de spam.`,
    cooldownSeconds: limitStatus.cooldownSeconds || VERIFICATION_RESEND_COOLDOWN_SECONDS,
    blockedSeconds: limitStatus.blockedSeconds,
    resendsRemaining: limitStatus.resendsRemaining,
  };
}

async function verifySignupPassword(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!password || password.length < 6) {
    return { ok: false, error: "Ingresa tu contraseña para confirmar el cambio." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (!error) {
    await supabase.auth.signOut();
    return { ok: true };
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("email not confirmed") ||
    message.includes("email address not confirmed")
  ) {
    await supabase.auth.signOut();
    return { ok: true };
  }

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return { ok: false, error: "La contraseña no coincide con esta cuenta." };
  }

  return { ok: false, error: formatAuthError(error.message) };
}

export async function correctSignupEmailAction(input: {
  currentEmail: string;
  newEmail: string;
  password: string;
  nextPath?: string | null;
}): Promise<CorrectSignupEmailResult> {
  const currentEmail = normalizeEmail(input.currentEmail);
  const newEmail = normalizeEmail(input.newEmail);

  if (!isValidEmail(currentEmail) || !isValidEmail(newEmail)) {
    return { ok: false, error: "Ingresa un correo válido." };
  }

  if (currentEmail === newEmail) {
    return {
      ok: false,
      error: "El nuevo correo debe ser diferente al actual.",
    };
  }

  const passwordCheck = await verifySignupPassword(currentEmail, input.password);
  if (!passwordCheck.ok) {
    return { ok: false, error: passwordCheck.error };
  }

  const user = await findUserByEmail(currentEmail);
  if (!user) {
    return {
      ok: false,
      error: "No encontramos una cuenta pendiente con ese correo.",
    };
  }

  if (isEmailConfirmed(user)) {
    return {
      ok: false,
      error: EXISTING_CONFIRMED_ACCOUNT_ERROR,
    };
  }

  const newEmailUser = await findUserByEmail(newEmail);
  if (newEmailUser && newEmailUser.id !== user.id) {
    if (isEmailConfirmed(newEmailUser)) {
      return {
        ok: false,
        error: "Ya existe una cuenta confirmada con ese correo.",
      };
    }
    return {
      ok: false,
      error:
        "Ese correo ya está en uso en otra cuenta pendiente. Inicia sesión o usa otro correo.",
    };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: false,
  });

  if (updateError) {
    if (isAlreadyRegisteredAuthError(updateError)) {
      return {
        ok: false,
        error: "Ya existe una cuenta con ese correo.",
      };
    }
    return {
      ok: false,
      error: formatAuthError(updateError.message),
    };
  }

  await clearVerificationResendLimits(currentEmail);

  const postAuthPath = resolvePostAuthPath(input.nextPath);
  const sendResult = await resendVerificationEmailOnly({
    email: newEmail,
    postAuthPath,
  });

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  await recordInitialVerificationEmailSent(newEmail);
  const limitStatus = await getVerificationResendStatus(newEmail);

  return {
    ok: true,
    email: newEmail,
    notice: `Actualizamos tu correo a ${newEmail} y enviamos un nuevo código de verificación.`,
    cooldownSeconds:
      limitStatus.cooldownSeconds || VERIFICATION_RESEND_COOLDOWN_SECONDS,
    blockedSeconds: limitStatus.blockedSeconds,
    resendsRemaining: limitStatus.resendsRemaining,
  };
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
