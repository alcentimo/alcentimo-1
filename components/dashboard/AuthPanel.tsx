"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError(null);
    setSignupConfirmationSent(false);
    setConfirmPassword("");
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

    const supabase = createClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
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
        <div className="alert-success mt-4 text-base text-teal-800 sm:text-sm dark:text-teal-200">
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

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Accede al panel para gestionar tu catálogo.
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

        <div>
          <label htmlFor="password" className="label-field">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

        {mode === "signup" && (
          <div>
            <label htmlFor="confirm_password" className="label-field">
              Confirmar contraseña
            </label>
            <input
              id="confirm_password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
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
