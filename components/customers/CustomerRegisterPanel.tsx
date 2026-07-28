"use client";

import Link from "next/link";
import { useState } from "react";
import {
  completeCustomerPhone,
  quickRegisterOrSignInCustomer,
  signInCustomerByPhone,
} from "@/lib/customers/register-actions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import type { CatalogCustomerAuthMode } from "@/components/catalog-transactional/CatalogShellNavigation";
import { CUSTOMER_MIN_PASSWORD_LENGTH } from "@/lib/customers/phone-auth";

interface CustomerRegisterPanelProps {
  storeSlug: string;
  storeName: string;
  nextPath: string;
  needsPhoneCompletion?: boolean;
  suggestedDisplayName?: string | null;
  orderId?: string | null;
  mode?: CatalogCustomerAuthMode;
  variant?: "default" | "catalog";
  onCancel?: () => void;
  onSwitchMode?: (mode: CatalogCustomerAuthMode) => void;
  redirectOnSuccess?: boolean;
  onRegistered?: (profile: {
    displayName: string;
    phone: string;
    userId?: string | null;
  }) => void;
}

export function CustomerRegisterPanel({
  storeSlug,
  storeName,
  nextPath,
  needsPhoneCompletion = false,
  suggestedDisplayName = null,
  orderId = null,
  mode = "register",
  variant = "default",
  onCancel,
  onSwitchMode,
  redirectOnSuccess = true,
  onRegistered,
}: CustomerRegisterPanelProps) {
  const [displayName, setDisplayName] = useState(suggestedDisplayName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await quickRegisterOrSignInCustomer({
      storeSlug,
      nextPath,
      displayName,
      phone,
      password,
      confirmPassword,
      email: email.trim() || null,
      orderId,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onRegistered?.({
      displayName: result.displayName?.trim() || displayName.trim(),
      phone: result.phone?.trim() || phone.trim(),
    });

    if (redirectOnSuccess) {
      window.location.href = result.redirectTo;
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signInCustomerByPhone({
      storeSlug,
      nextPath,
      phone,
      password,
      orderId,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onRegistered?.({
      displayName: result.displayName?.trim() || "Cliente",
      phone: result.phone?.trim() || phone.trim(),
    });

    if (redirectOnSuccess) {
      window.location.href = result.redirectTo;
    }
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

    onRegistered?.({
      displayName: (displayName.trim() || suggestedDisplayName || "").trim(),
      phone: phone.trim(),
    });

    if (redirectOnSuccess) {
      window.location.href = result.redirectTo;
    }
  }

  const isBusy = loading;
  const catalogUrl = getStoreCatalogBasePath(storeSlug);
  const isCatalog = variant === "catalog";
  const shellClass = isCatalog ? "catalog-register-panel" : "card-panel mx-auto w-full max-w-md";

  if (needsPhoneCompletion) {
    return (
      <div className={shellClass}>
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
          {onCancel ? (
            <button type="button" onClick={onCancel} className="link-brand">
              ← Volver al catálogo
            </button>
          ) : (
            <Link href={catalogUrl} className="link-brand">
              ← Volver al catálogo
            </Link>
          )}
        </p>
      </div>
    );
  }

  if (isLogin) {
    return (
      <div className={shellClass}>
        {!isCatalog ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {storeName}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
              Entra con tu teléfono y contraseña.
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Entra con tu teléfono y contraseña.
          </p>
        )}

        <GoogleSignInButton
          postAuthPath={nextPath}
          storeSlug={storeSlug}
          orderId={orderId ?? undefined}
          disabled={isBusy}
          className="mt-6"
          buttonClassName="rounded-[10px] border-zinc-200/80 py-3.5 font-semibold shadow-[0_1px_2px_rgba(24,24,27,0.04)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
          onError={(message) => setError(message)}
        />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
          </div>
          <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
            o con teléfono
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone_login" className="label-field">
              Teléfono
            </label>
            <input
              id="phone_login"
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
            <label htmlFor="password_login" className="label-field">
              Contraseña
            </label>
            <PasswordInput
              id="password_login"
              autoComplete="current-password"
              required
              minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>

          {error ? <p className="alert-error">{error}</p> : null}

          <button type="submit" disabled={isBusy} className="btn-primary w-full">
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          ¿No tienes cuenta?{" "}
          {onSwitchMode ? (
            <button
              type="button"
              className="link-brand font-semibold"
              onClick={() => {
                setError(null);
                onSwitchMode("register");
              }}
            >
              Crear cuenta
            </button>
          ) : (
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Regístrate con tu nombre, teléfono y contraseña.
            </span>
          )}
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          {onCancel ? (
            <button type="button" onClick={onCancel} className="link-brand">
              ← Volver al catálogo
            </button>
          ) : (
            <Link href={catalogUrl} className="link-brand">
              ← Volver al catálogo
            </Link>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {!isCatalog ? (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            {storeName}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
            Crea tu cuenta
          </h2>
          <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            Nombre, teléfono y una contraseña para guardar tus pedidos.
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nombre, teléfono y una contraseña para guardar tus pedidos.
        </p>
      )}

      <GoogleSignInButton
        postAuthPath={nextPath}
        storeSlug={storeSlug}
        orderId={orderId ?? undefined}
        disabled={isBusy}
        className="mt-6"
        buttonClassName="rounded-[10px] border-zinc-200/80 py-3.5 font-semibold shadow-[0_1px_2px_rgba(24,24,27,0.04)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
        onError={(message) => setError(message)}
      />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
          o con teléfono
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
            Teléfono
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
          <label htmlFor="password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Mínimo ${CUSTOMER_MIN_PASSWORD_LENGTH} caracteres`}
          />
        </div>

        <div>
          <label htmlFor="confirm_password" className="label-field">
            Confirmar contraseña
          </label>
          <PasswordInput
            id="confirm_password"
            autoComplete="new-password"
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña"
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
          {loading ? "Creando cuenta…" : `Unirme a ${storeName}`}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        {onSwitchMode ? (
          <button
            type="button"
            className="link-brand font-semibold"
            onClick={() => {
              setError(null);
              onSwitchMode("login");
            }}
          >
            Iniciar sesión
          </button>
        ) : (
          <span>Inicia sesión con tu teléfono y contraseña.</span>
        )}
      </p>

      <p className="mt-4 text-center text-sm text-zinc-500">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="link-brand">
            ← Volver al catálogo
          </button>
        ) : (
          <Link href={catalogUrl} className="link-brand">
            ← Volver al catálogo
          </Link>
        )}
      </p>
    </div>
  );
}
