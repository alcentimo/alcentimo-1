"use client";

import Link from "next/link";
import { useState } from "react";
import { devSignUpAndSignIn } from "@/lib/auth/dev-signup";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { PasswordInput } from "@/components/ui/PasswordInput";

const devSkipEmailConfirmation =
  process.env.NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION === "true";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError(null);
    setSignupConfirmationSent(false);
    setConfirmPassword("");
  }

  async function handleGoogleAuth() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const redirectTo = getAuthCallbackUrl("/onboarding");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setGoogleLoading(false);
      setError(oauthError.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
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
        setError(devResult.error);
        return;
      }

      window.location.href = "/onboarding";
      return;
    }

    const supabase = createClient();
    const emailRedirectTo = getAuthCallbackUrl("/onboarding");

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo },
          });

    setLoading(false);

    if (result.error) {
      const message = result.error.message;
      if (message.toLowerCase().includes("rate limit")) {
        setError(
          "Límite de envío de correos alcanzado. En desarrollo, desactiva «Confirm email» en Supabase (Authentication → Providers → Email) o habilita NEXT_PUBLIC_DEV_SKIP_EMAIL_CONFIRMATION=true en .env.local.",
        );
        return;
      }
      setError(message);
      return;
    }

    if (mode === "signup" && result.data.user && !result.data.session) {
      setSignupConfirmationSent(true);
      return;
    }

    window.location.href = "/onboarding";
  }

  if (signupConfirmationSent) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Revisa tu correo
        </h2>
        <div className="alert-success mt-4 text-base text-emerald-800 sm:text-sm dark:text-emerald-200">
          ¡Casi listo! Hemos enviado un enlace de confirmación a tu correo. Por
          favor, revísalo para activar tu cuenta.
        </div>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Cuando confirmes tu cuenta, podrás iniciar sesión y configurar tu
          tienda.
        </p>
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="btn-primary mt-6 w-full"
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  const isBusy = loading || googleLoading;

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Accede al panel para gestionar tu catálogo.
      </p>

      {devSkipEmailConfirmation && mode === "signup" && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Modo desarrollo: el registro no envía correo de confirmación.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleGoogleAuth()}
        disabled={isBusy}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-[10px] border border-zinc-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <GoogleIcon />
        {googleLoading ? "Redirigiendo a Google…" : "Continuar con Google"}
      </button>

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
            onChange={(e) => setEmail(e.target.value)}
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

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={isBusy} className="btn-primary">
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
