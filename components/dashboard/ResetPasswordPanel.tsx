"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    async function verifySession() {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getUser();

      if (sessionError || !data.user) {
        setHasSession(false);
      } else {
        setHasSession(true);
      }

      setCheckingSession(false);
    }

    void verifySession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPasswordUpdated(true);
  }

  if (checkingSession) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Verificando enlace de recuperación…
        </p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Enlace inválido o expirado
        </h2>
        <p className="alert-error mt-4">
          No pudimos validar tu sesión de recuperación. Solicita un nuevo
          enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/dashboard/recuperar-contrasena"
          className="btn-primary mt-6 block w-full text-center"
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Contraseña actualizada
        </h2>
        <div className="alert-success mt-4 text-base text-teal-800 sm:text-sm dark:text-teal-200">
          Tu contraseña se actualizó correctamente. Ya puedes usar tu cuenta
          con la nueva contraseña.
        </div>
        <Link href="/dashboard" className="btn-primary mt-6 block w-full text-center">
          Ir al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Nueva contraseña
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Elige una contraseña segura para tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="password" className="label-field">
            Nueva contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>

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

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Guardando…" : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
