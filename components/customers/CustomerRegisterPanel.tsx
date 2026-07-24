"use client";

import Link from "next/link";
import { useState } from "react";
import {
  completeCustomerPhone,
  quickRegisterOrSignInCustomer,
} from "@/lib/customers/register-actions";
import { createClient } from "@/lib/supabase/client";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { getAuthCallbackUrl } from "@/lib/site-url";

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

interface CustomerRegisterPanelProps {
  storeSlug: string;
  storeName: string;
  nextPath: string;
  needsPhoneCompletion?: boolean;
  suggestedDisplayName?: string | null;
  orderId?: string | null;
}

export function CustomerRegisterPanel({
  storeSlug,
  storeName,
  nextPath,
  needsPhoneCompletion = false,
  suggestedDisplayName = null,
  orderId = null,
}: CustomerRegisterPanelProps) {
  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleAuth() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const redirectTo = getAuthCallbackUrl(nextPath, {
      store: storeSlug,
      orderId: orderId ?? undefined,
    });

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

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await quickRegisterOrSignInCustomer({
      storeSlug,
      nextPath,
      displayName,
      phone,
      email: email.trim() || null,
      orderId,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.href = result.redirectTo;
  }

  async function handlePhoneCompletion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await completeCustomerPhone({
      storeSlug,
      nextPath,
      phone,
      displayName: displayName.trim() || suggestedDisplayName,
      orderId,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.href = result.redirectTo;
  }

  const isBusy = loading || googleLoading;
  const catalogUrl = getStoreCatalogBasePath(storeSlug);

  if (needsPhoneCompletion) {
    return (
      <div className="card-panel mx-auto w-full max-w-md">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {storeName}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Un paso más
        </h2>
        <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
          Confirma tu WhatsApp para activar descuentos y recibir actualizaciones de
          pedidos.
        </p>

        <form onSubmit={handlePhoneCompletion} className="mt-6 space-y-5">
          {!suggestedDisplayName ? (
            <div>
              <label htmlFor="display_name_complete" className="label-field">
                Nombre
              </label>
              <input
                id="display_name_complete"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Tu nombre"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="phone_complete" className="label-field">
              Teléfono (WhatsApp)
            </label>
            <input
              id="phone_complete"
              type="tel"
              autoComplete="tel"
              required
              minLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="0412 1234567"
            />
          </div>

          {error ? <p className="alert-error">{error}</p> : null}

          <button type="submit" disabled={isBusy} className="btn-primary w-full">
            {loading ? "Guardando…" : "Activar mi cuenta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href={catalogUrl} className="link-brand">
            ← Volver al catálogo
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card-panel mx-auto w-full max-w-md">
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        {storeName}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
        Regístrate en segundos
      </h2>
      <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
        Sin contraseñas. Solo tu nombre y WhatsApp para comprar más rápido.
      </p>

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
          o en 5 segundos
        </p>
      </div>

      <form onSubmit={handleQuickSubmit} className="space-y-4">
        <div>
          <label htmlFor="display_name" className="label-field">
            Nombre
          </label>
          <input
            id="display_name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label htmlFor="phone" className="label-field">
            Teléfono (WhatsApp)
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="0412 1234567"
          />
        </div>

        <div>
          <label htmlFor="email" className="label-field">
            Correo <span className="font-normal text-zinc-400">(opcional)</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="solo si quieres recibir novedades"
          />
        </div>

        {error ? <p className="alert-error">{error}</p> : null}

        <button type="submit" disabled={isBusy} className="btn-primary w-full">
          {loading ? "Entrando…" : `Unirme a ${storeName}`}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        ¿Ya te registraste? Usa el mismo WhatsApp y entrarás al instante.
      </p>

      <p className="mt-4 text-center text-sm text-zinc-500">
        <Link href={catalogUrl} className="link-brand">
          ← Volver al catálogo
        </Link>
      </p>
    </div>
  );
}
