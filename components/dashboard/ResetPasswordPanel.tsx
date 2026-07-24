"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import {
  establishRecoverySession,
  getRecoveryUrlDebug,
} from "@/lib/auth/recovery-url";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordPanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function bootstrapRecoverySession() {
      try {
        const urlDebug = getRecoveryUrlDebug();

        console.group("[reset-password] URL recibida");
        console.log("href:", urlDebug.href);
        console.log("pathname:", urlDebug.pathname);
        console.log("search:", urlDebug.search || "(vacío)");
        console.log("hash length:", urlDebug.hashLength);
        console.log("code presente:", Boolean(urlDebug.code));
        console.log("code (enmascarado):", urlDebug.maskedCode);
        console.log("code length:", urlDebug.codeLength);
        console.log("token_hash (enmascarado):", urlDebug.maskedTokenHash);
        console.log("token_hash length:", urlDebug.tokenHashLength);
        console.log("type (query):", urlDebug.type);
        console.log("type (hash):", urlDebug.hashType);
        console.log("hash access_token:", urlDebug.hasHashAccessToken);
        console.log("hash refresh_token:", urlDebug.hasHashRefreshToken);
        if (urlDebug.errorParam) {
          console.warn("error en URL:", urlDebug.errorParam);
        }
        console.groupEnd();

        const supabase = createClient();
        const recoveryResult = await establishRecoverySession(supabase);

        console.log("[reset-password] establishRecoverySession:", recoveryResult);

        if (!recoveryResult.ok) {
          if (recoveryResult.method === "redirect-auth-confirm") {
            return;
          }
          setHasSession(false);
          setError(formatAuthError(recoveryResult.error));
          setCheckingSession(false);
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !data.user) {
          console.warn("[reset-password] getUser falló:", sessionError?.message);
          setHasSession(false);
          setError(
            formatAuthError(
              sessionError?.message ??
                "No pudimos validar tu sesión de recuperación.",
            ),
          );
        } else {
          console.log("[reset-password] sesión válida para:", data.user.email);
          setHasSession(true);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error inesperado al cargar.";
        setHasSession(false);
        setError(formatAuthError(message));
      } finally {
        setCheckingSession(false);
      }
    }

    void bootstrapRecoverySession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(formatAuthError(updateError.message));
        return;
      }

      await supabase.auth.signOut({ scope: "global" });
      router.push("/dashboard/restablecer-contrasena/exito");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la contraseña.";
      setError(formatAuthError(message));
    } finally {
      setLoading(false);
    }
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
          {error ??
            "No pudimos validar tu sesión de recuperación. Solicita un nuevo enlace para restablecer tu contraseña."}
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Abre la consola del navegador (F12) para ver los detalles de depuración
          de la URL recibida.
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

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Nueva contraseña
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Elige una contraseña segura de al menos {MIN_PASSWORD_LENGTH} caracteres.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="password" className="label-field">
            Nueva contraseña
          </label>
          <PasswordInput
            id="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirm_password" className="label-field">
            Confirmar contraseña
          </label>
          <PasswordInput
            id="confirm_password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
