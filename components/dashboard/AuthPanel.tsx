"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { signUpWithConfirmationEmailAction } from "@/lib/auth/auth-email-actions";
import {
  PENDING_CONFIRMATION_RESENT_MESSAGE,
  isPendingActivationNotice,
  isExistingConfirmedAccountError,
  parseAuthEmailActionResult,
} from "@/lib/auth/auth-email-types";
import { devSignUpAndSignIn } from "@/lib/auth/dev-signup";
import {
  isInvitationNextPath,
  resolvePostAuthPath,
} from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SignupEmailVerificationPanel } from "@/components/dashboard/SignupEmailVerificationPanel";

const devSkipEmailConfirmation =
  process.env.NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION === "true";

export function AuthPanel() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const modeParam = searchParams.get("mode");
  const postAuthPath = resolvePostAuthPath(nextParam);
  const isInvitationFlow = isInvitationNextPath(nextParam);

  const [mode, setMode] = useState<"login" | "signup">(
    isInvitationFlow || modeParam === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [existingAccountNotice, setExistingAccountNotice] = useState(false);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError(null);
    setSuccessNotice(null);
    setSignupConfirmationSent(false);
    setSignupNotice(null);
    setConfirmPassword("");
    setAcceptedLegalTerms(false);
    if (nextMode === "signup") {
      setExistingAccountNotice(false);
    }
  }

  function goToLoginForExistingAccount() {
    setError(null);
    setSuccessNotice(null);
    setExistingAccountNotice(true);
    setMode("login");
    window.requestAnimationFrame(() => {
      document.getElementById("password")?.focus();
    });
  }

  function showPendingActivationNotice(notice?: string | null) {
    const message = notice?.trim() || PENDING_CONFIRMATION_RESENT_MESSAGE;
    setError(null);
    setSuccessNotice(message);
    setSignupNotice(message);
    setSignupConfirmationSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (mode === "signup") {
      if (!acceptedLegalTerms) {
        setError(
          "Debes aceptar los Términos y Condiciones y la Política de Privacidad.",
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);

    if (mode === "signup" && devSkipEmailConfirmation) {
      const devResult = await devSignUpAndSignIn(email, password);
      setLoading(false);

      if (!devResult.ok) {
        if (isExistingConfirmedAccountError(devResult.error)) {
          goToLoginForExistingAccount();
          return;
        }
        setError(formatAuthError(devResult.error));
        return;
      }

      window.location.href = postAuthPath;
      return;
    }

    if (mode === "signup") {
      try {
        const rawResult = await signUpWithConfirmationEmailAction({
          email,
          password,
          nextPath: nextParam,
        });
        const signupResult = parseAuthEmailActionResult(rawResult);
        setLoading(false);

        // Éxito o reenvío de activación → aviso verde/azul, nunca alerta roja.
        if (signupResult.ok) {
          if (
            signupResult.resentPendingConfirmation ||
            (signupResult.notice &&
              isPendingActivationNotice(signupResult.notice))
          ) {
            showPendingActivationNotice(signupResult.notice);
            return;
          }

          setSignupNotice(signupResult.notice ?? null);
          setSignupConfirmationSent(true);
          return;
        }

        // Defensivo: el backend a veces puede devolver el aviso en `error`.
        if (isPendingActivationNotice(signupResult.error)) {
          showPendingActivationNotice(signupResult.error);
          return;
        }

        // Cuenta ya confirmada → login con aviso claro.
        if (isExistingConfirmedAccountError(signupResult.error)) {
          goToLoginForExistingAccount();
          return;
        }

        setError(
          signupResult.error.startsWith("No pudimos reenviar")
            ? signupResult.error
            : formatAuthError(signupResult.error),
        );
      } catch (caught) {
        setLoading(false);
        const message =
          caught instanceof Error ? caught.message : String(caught ?? "");

        if (isExistingConfirmedAccountError(message)) {
          goToLoginForExistingAccount();
          return;
        }

        if (isPendingActivationNotice(message)) {
          showPendingActivationNotice(message);
          return;
        }

        setError(formatAuthError(message || "No se pudo completar el registro."));
      }
      return;
    }

    const supabase = createClient();

    const result = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      const message = result.error.message;
      if (message.toLowerCase().includes("rate limit")) {
        setError(
          "Límite de envío de correos alcanzado. Intenta de nuevo más tarde.",
        );
        return;
      }
      setError(formatAuthError(message));
      return;
    }

    window.location.href = postAuthPath;
  }

  if (signupConfirmationSent) {
    return (
      <SignupEmailVerificationPanel
        email={email}
        nextPath={postAuthPath}
        notice={signupNotice}
        isInvitationFlow={isInvitationFlow}
        freshSignup
        signupPassword={password}
        onBackToLogin={() => switchMode("login")}
      />
    );
  }

  const isBusy = loading;

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        {isInvitationFlow
          ? "Crea tu cuenta o inicia sesión para aceptar la invitación al equipo."
          : "Accede al panel para gestionar tu catálogo."}
      </p>

      {isInvitationFlow ? (
        <p className="mt-3 rounded-lg border border-teal-200/80 bg-teal-50/70 px-3 py-2 text-xs text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
          Usa el mismo correo al que te llegó la invitación.
        </p>
      ) : null}

      {devSkipEmailConfirmation && mode === "signup" && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Modo desarrollo: el registro no envía correo de confirmación.
        </p>
      )}

      <GoogleSignInButton
        postAuthPath={postAuthPath}
        disabled={isBusy}
        className="mt-6"
        buttonClassName="rounded-[10px] border-zinc-200/80 py-3.5 font-semibold shadow-[0_1px_2px_rgba(24,24,27,0.04)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
        onError={(message) => setError(formatAuthError(message))}
      />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
          o con tu correo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            onChange={(e) => {
              setEmail(e.target.value);
              setExistingAccountNotice(false);
            }}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "login" && (
            <p className="mt-2 text-right">
              <Link href="/dashboard/recuperar-contrasena" className="link-brand text-sm">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <label htmlFor="confirm_password" className="label-field">
              Confirmar contraseña
            </label>
            <PasswordInput
              id="confirm_password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {mode === "signup" && (
          <label className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <input
              id="accept_legal_terms"
              type="checkbox"
              checked={acceptedLegalTerms}
              onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
            />
            <span>
              Acepto los{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="link-brand"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="link-brand"
              >
                Política de Privacidad
              </Link>
            </span>
          </label>
        )}

        {existingAccountNotice && mode === "login" ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            Este correo ya está registrado.{" "}
            <button
              type="button"
              className="link-brand font-semibold underline"
              onClick={() => document.getElementById("password")?.focus()}
            >
              Haz clic aquí para iniciar sesión
            </button>
            .
          </div>
        ) : null}

        {successNotice ? (
          <p
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            {successNotice}
          </p>
        ) : null}

        {error ? <p className="alert-error">{error}</p> : null}

        <button
          type="submit"
          disabled={isBusy || (mode === "signup" && !acceptedLegalTerms)}
          className="btn-primary"
        >
          {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Registrarme"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => switchMode(mode === "login" ? "signup" : "login")}
        className="touch-target mt-5 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {mode === "login" ? (
          <>
            ¿No tienes cuenta?{" "}
            <span className="link-brand">Regístrate</span>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <span className="link-brand">Inicia sesión</span>
          </>
        )}
      </button>
    </div>
  );
}
