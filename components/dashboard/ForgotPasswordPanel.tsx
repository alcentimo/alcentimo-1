"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  correctPasswordRecoveryEmailAction,
  sendPasswordResetEmailAction,
} from "@/lib/auth/auth-email-actions";
import { VERIFICATION_RESEND_MAX_CONSECUTIVE } from "@/lib/auth/verification-resend-ui";
import { usePasswordRecoveryResend } from "@/components/dashboard/usePasswordRecoveryResend";

interface PasswordRecoverySentPanelProps {
  initialEmail: string;
  freshSend?: boolean;
}

function PasswordRecoverySentBody({
  email,
  freshSend = false,
  sessionKey,
  notice = null,
  onEmailCorrected,
}: {
  email: string;
  freshSend?: boolean;
  sessionKey: number;
  notice?: string | null;
  onEmailCorrected?: (newEmail: string, notice: string) => void;
}) {
  const [showEmailCorrection, setShowEmailCorrection] = useState(false);
  const [correctedEmail, setCorrectedEmail] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctingEmail, setCorrectingEmail] = useState(false);

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
  } = usePasswordRecoveryResend({ email, freshSend });

  async function handleCorrectEmail(event: React.FormEvent) {
    event.preventDefault();
    setCorrectionError(null);
    setCorrectingEmail(true);

    const result = await correctPasswordRecoveryEmailAction({
      previousEmail: email,
      newEmail: correctedEmail,
    });

    setCorrectingEmail(false);

    if (!result.ok) {
      setCorrectionError(result.error);
      return;
    }

    setShowEmailCorrection(false);
    setCorrectedEmail("");
    onEmailCorrected?.(result.email, result.notice);
  }

  const displayNotice = resendNotice ?? notice;
  const isBlocked = blockedSeconds > 0;
  const isCooldown = cooldownSeconds > 0 && !isBlocked;

  return (
    <>
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
            Si existe una cuenta con <strong>{email}</strong>, te enviamos un enlace
            para restablecer tu contraseña.
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>
          Correo actual: <strong className="text-zinc-700 dark:text-zinc-200">{email}</strong>
        </span>
        {!showEmailCorrection ? (
          <button
            type="button"
            onClick={() => {
              setShowEmailCorrection(true);
              setCorrectedEmail("");
              setCorrectionError(null);
            }}
            className="link-brand text-sm font-medium"
          >
            ¿Escribiste mal tu correo? Modificar
          </button>
        ) : null}
      </div>

      {showEmailCorrection ? (
        <form
          onSubmit={handleCorrectEmail}
          className="mt-4 space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Escribe el correo correcto. Enviaremos el enlace de recuperación a esa
            dirección.
          </p>
          <div>
            <label htmlFor={`recovery-corrected-email-${sessionKey}`} className="label-field">
              Nuevo correo
            </label>
            <input
              id={`recovery-corrected-email-${sessionKey}`}
              type="email"
              required
              autoComplete="email"
              value={correctedEmail}
              onChange={(event) => setCorrectedEmail(event.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
            />
          </div>
          {correctionError ? (
            <p className="alert-error" role="alert">
              {correctionError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={correctingEmail}
              className="btn-primary"
            >
              {correctingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                "Guardar y reenviar enlace"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmailCorrection(false);
                setCorrectionError(null);
              }}
              disabled={correctingEmail}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Revisa también la carpeta de spam. El enlace expira por seguridad en 24 horas.
      </p>

      <div className="mt-4 space-y-2 text-center text-sm">
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
            ¿No recibiste el enlace?{" "}
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
        <p className="alert-error mt-3" role="alert">
          {resendError}
        </p>
      ) : null}

      <Link href="/dashboard/login" className="btn-primary mt-6 block w-full text-center">
        Volver a iniciar sesión
      </Link>
    </>
  );
}

export function ForgotPasswordPanel({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [activeEmail, setActiveEmail] = useState("");
  const [sessionKey, setSessionKey] = useState(0);
  const [correctionNotice, setCorrectionNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await sendPasswordResetEmailAction({ email });

    setLoading(false);

    if (!result.ok) {
      setError(formatAuthError(result.error));
      return;
    }

    setActiveEmail(email.trim().toLowerCase());
    setEmailSent(true);
    setCorrectionNotice(null);
  }

  if (emailSent) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Revisa tu correo
        </h2>

        <PasswordRecoverySentBody
          key={`${activeEmail}-${sessionKey}`}
          email={activeEmail}
          freshSend
          notice={correctionNotice}
          sessionKey={sessionKey}
          onEmailCorrected={(newEmail, notice) => {
            setActiveEmail(newEmail);
            setCorrectionNotice(notice);
            setSessionKey((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Recuperar contraseña
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Te enviaremos un enlace para crear una nueva contraseña.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="email" className="label-field">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Enviando…" : "Enviar enlace de recuperación"}
        </button>
      </form>

      <Link
        href="/dashboard/login"
        className="touch-target mt-5 block w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <span className="link-brand">Volver a iniciar sesión</span>
      </Link>
    </div>
  );
}
