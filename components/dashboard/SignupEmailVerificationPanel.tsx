"use client";

import Link from "next/link";
import { useState } from "react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { verifySignupOtpAction } from "@/lib/auth/auth-email-actions";
import { resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";

interface SignupEmailVerificationPanelProps {
  email: string;
  nextPath?: string | null;
  initialError?: string | null;
  isInvitationFlow?: boolean;
  onBackToLogin?: () => void;
}

export function SignupEmailVerificationPanel({
  email,
  nextPath,
  initialError = null,
  isInvitationFlow = false,
  onBackToLogin,
}: SignupEmailVerificationPanelProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const postAuthPath = resolvePostAuthPath(nextPath);

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

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Confirma tu cuenta
      </h2>

      <div className="alert-success mt-4 text-base text-emerald-800 sm:text-sm dark:text-emerald-200">
        Enviamos un correo a <strong>{email}</strong> con un enlace de confirmación
        y un código de 6 dígitos.
      </div>

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
