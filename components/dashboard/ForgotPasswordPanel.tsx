"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPasswordResetRedirectUrl } from "@/lib/site-url";

export function ForgotPasswordPanel() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = getPasswordResetRedirectUrl();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    setLoading(false);

    if (resetError) {
      const message = resetError.message;
      if (message.toLowerCase().includes("rate limit")) {
        setError(
          "Límite de envío de correos alcanzado. Intenta de nuevo más tarde.",
        );
        return;
      }
      setError(message);
      return;
    }

    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Revisa tu correo
        </h2>
        <div className="alert-success mt-4 text-base text-teal-800 sm:text-sm dark:text-teal-200">
          Si existe una cuenta con ese correo, te enviamos un enlace para
          restablecer tu contraseña.
        </div>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Revisa también la carpeta de spam. El enlace expira después de un
          tiempo por seguridad.
        </p>
        <Link href="/dashboard/login" className="btn-primary mt-6 block w-full text-center">
          Volver a iniciar sesión
        </Link>
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
