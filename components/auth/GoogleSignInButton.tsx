"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { completeGoogleAuthAction } from "@/lib/auth/complete-google-auth-action";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getGoogleClientId } from "@/lib/auth/google-client-id";
import { generateGoogleNoncePair } from "@/lib/auth/google-nonce";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

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

export interface GoogleSignInButtonProps {
  postAuthPath: string;
  storeSlug?: string;
  orderId?: string;
  disabled?: boolean;
  className?: string;
  /** Clases del botón visible (capa decorativa). */
  buttonClassName?: string;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({
  postAuthPath,
  storeSlug,
  orderId,
  disabled = false,
  className,
  buttonClassName,
  onError,
}: GoogleSignInButtonProps) {
  const clientId = getGoogleClientId();
  const [noncePair, setNoncePair] = useState<[string, string] | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const refreshNonce = useCallback(async () => {
    setNoncePair(await generateGoogleNoncePair());
  }, []);

  useEffect(() => {
    void refreshNonce();
  }, [refreshNonce]);

  async function handleSuccess(credentialResponse: CredentialResponse) {
    const token = credentialResponse.credential?.trim();
    if (!token || !noncePair) {
      const message = "No se recibió el token de Google.";
      setLocalError(message);
      onError?.(message);
      return;
    }

    setBusy(true);
    setLocalError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
        nonce: noncePair[0],
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      const result = await completeGoogleAuthAction({
        nextPath: postAuthPath,
        storeSlug,
        orderId,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      window.location.assign(result.redirectTo);
    } catch (error) {
      const message = formatAuthError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.",
      );
      setBusy(false);
      setLocalError(message);
      onError?.(message);
      await refreshNonce();
    }
  }

  function handleGoogleError() {
    const message = "Google canceló o rechazó el inicio de sesión.";
    setLocalError(message);
    onError?.(message);
    void refreshNonce();
  }

  if (!clientId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        Falta configurar{" "}
        <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en el
        entorno.
      </p>
    );
  }

  const isDisabled = disabled || busy || !noncePair;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative w-full min-h-11",
          isDisabled && "pointer-events-none opacity-60",
        )}
      >
        {noncePair ? (
          <div className="absolute inset-0 z-10 overflow-hidden opacity-[0.01]">
            <GoogleLogin
              nonce={noncePair[1]}
              onSuccess={(response) => void handleSuccess(response)}
              onError={handleGoogleError}
              useOneTap={false}
              ux_mode="popup"
              context="signin"
              width="400"
              itp_support
            />
          </div>
        ) : null}

        <div
          className={cn(
            "pointer-events-none relative z-0 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
            buttonClassName,
          )}
          aria-hidden="true"
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Conectando con Google…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continuar con Google
            </>
          )}
        </div>
      </div>

      {localError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {localError}
        </p>
      ) : null}
    </div>
  );
}
