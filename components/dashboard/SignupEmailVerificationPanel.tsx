"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { verifySignupOtpAction } from "@/lib/auth/auth-email-actions";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { VERIFICATION_RESEND_MAX_CONSECUTIVE } from "@/lib/auth/verification-resend-ui";
import { useVerificationResend } from "@/components/dashboard/useVerificationResend";

interface SignupEmailVerificationPanelProps {
  email: string;
  nextPath?: string | null;
  notice?: string | null;
  initialError?: string | null;
  isInvitationFlow?: boolean;
  onBackToLogin?: () => void;
  /** Pantalla mostrada justo después del registro (correo inicial recién enviado). */
  freshSignup?: boolean;
}

export function SignupEmailVerificationPanel({
  email,
  nextPath,
  notice = null,
  initialError = null,
  isInvitationFlow = false,
  onBackToLogin,
  freshSignup = false,
}: SignupEmailVerificationPanelProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const postAuthPath = resolvePostAuthPath(nextPath);

  const {
    canResend,
    resending,
    resendNotice,
    resendError,
    resendsRemaining,
    blockedSeconds,
    cooldownSeconds,
    countdownLabel,
    resend,
  } = useVerificationResend({ email, nextPath, freshSignup });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await verifySignupOtpAction({
      email,
      token: code,
    });

    setLoading(false);

    if (!result.ok) {
      setError(formatAuthError(result.error));
      return;
    }

    window.location.href = postAuthPath;
  }

  const displayNotice = resendNotice ?? notice;
  const isBlocked = blockedSeconds > 0;
  const isCooldown = cooldownSeconds > 0 && !isBlocked;

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Confirma tu cuenta
      </h2>

      <div
        className={
          displayNotice
            ? "mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100"
            : "alert-success mt-4 text-base text-emerald-800 sm:text-sm dark:text-emerald-200"
        }
        role="status"
      >
        {displayNotice ? (
          displayNotice
        ) : (
          <>
            Enviamos un correo a <strong>{email}</strong> con un enlace de confirmación
            y un código de 6 dígitos.
          </>
        )}
      </div>

      {displayNotice ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Revisa <strong>{email}</strong> y usa el enlace o el código de 6 dígitos para
          activar tu cuenta.
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {isInvitationFlow
          ? "Cuando confirmes tu cuenta, volverás automáticamente al enlace de invitación para unirte al equipo."
          : "Puedes usar el botón del correo o introducir el código aquí para activar tu cuenta y continuar con la configuración de tu tienda."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="signup_verification_code" className="label-field">
            Código de verificación
          </label>
          <input
            id="signup_verification_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="input-field text-center text-lg tracking-[0.35em] font-semibold"
            placeholder="000000"
            aria-describedby="signup_verification_code_help"
          />
          <p
            id="signup_verification_code_help"
            className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Introduce los 6 dígitos que aparecen en el correo de confirmación.
          </p>
        </div>

        <div className="space-y-2 text-center text-sm">
          {isBlocked ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
              role="alert"
            >
              Has alcanzado el límite de {VERIFICATION_RESEND_MAX_CONSECUTIVE} reenvíos.
              Podrás solicitar otro correo en{" "}
              <strong className="tabular-nums">{countdownLabel}</strong>.
            </p>
          ) : isCooldown ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              Podrás reenviar el correo en{" "}
              <strong className="tabular-nums text-zinc-700 dark:text-zinc-200">
                {countdownLabel}
              </strong>
            </p>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">
              ¿No recibiste el código?{" "}
              <button
                type="button"
                onClick={() => void resend()}
                disabled={!canResend}
                className="link-brand font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Reenviando…
                  </span>
                ) : (
                  "Reenviar correo"
                )}
              </button>
            </p>
          )}

          {!isBlocked && resendsRemaining < VERIFICATION_RESEND_MAX_CONSECUTIVE ? (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Reenvíos restantes: {resendsRemaining} de {VERIFICATION_RESEND_MAX_CONSECUTIVE}
            </p>
          ) : null}
        </div>

        {resendError ? (
          <p className="alert-error" role="alert">
            {resendError}
          </p>
        ) : null}

        {error ? <p className="alert-error">{error}</p> : null}

        <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
          {loading ? "Verificando…" : "Confirmar cuenta"}
        </button>
      </form>

      {onBackToLogin ? (
        <button
          type="button"
          onClick={onBackToLogin}
          className="touch-target mt-5 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <span className="link-brand">Volver a iniciar sesión</span>
        </button>
      ) : (
        <Link
          href="/dashboard/login"
          className="touch-target mt-5 block w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <span className="link-brand">Volver a iniciar sesión</span>
        </Link>
      )}
    </div>
  );
}
