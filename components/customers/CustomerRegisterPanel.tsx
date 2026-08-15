"use client";

import Link from "next/link";
import { useState } from "react";
import {
  completeCustomerPhone,
  quickRegisterOrSignInCustomer,
  signInCustomer,
} from "@/lib/customers/register-actions";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CustomerVerificationFields } from "@/components/customers/CustomerVerificationFields";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { buildCustomerRegisterPath } from "@/lib/customers/middleware-access";
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
    phone?: string | null;
    contactEmail?: string | null;
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
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const catalogUrl = getStoreCatalogBasePath(storeSlug);
  const googleCompletionBase = buildCustomerRegisterPath(storeSlug, nextPath);
  const googleCompletionPath = `${googleCompletionBase}${
    googleCompletionBase.includes("?") ? "&" : "?"
  }complete=phone${orderId ? `&orderId=${encodeURIComponent(orderId)}` : ""}`;

  const verificationFieldProps = {
    documentId,
    phone,
    businessName,
    city,
    stateRegion,
    socialUrl,
    disabled: loading,
    onDocumentIdChange: setDocumentId,
    onPhoneChange: setPhone,
    onBusinessNameChange: setBusinessName,
    onCityChange: setCity,
    onStateRegionChange: setStateRegion,
    onSocialUrlChange: setSocialUrl,
  };

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await quickRegisterOrSignInCustomer({
        storeSlug,
        nextPath,
        displayName,
        method: "email",
        phone,
        email,
        password,
        orderId,
        requireVerificationFields: true,
        documentId,
        businessName,
        city,
        state: stateRegion,
        socialUrl,
      });

      if (!result.ok) {
        setError(formatAuthError(result.error));
        return;
      }

      onRegistered?.({
        displayName: result.displayName?.trim() || displayName.trim(),
        phone: result.phone ?? null,
        contactEmail: result.contactEmail ?? null,
      });

      if (redirectOnSuccess) {
        window.location.href = result.redirectTo;
      }
    } catch (submitError) {
      setError(
        formatAuthError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo crear la cuenta.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signInCustomer({
        storeSlug,
        nextPath,
        method: "email",
        email,
        password,
        orderId,
      });

      if (!result.ok) {
        setError(formatAuthError(result.error));
        return;
      }

      onRegistered?.({
        displayName: result.displayName?.trim() || "Cliente",
        phone: result.phone ?? null,
        contactEmail: result.contactEmail ?? null,
      });

      if (redirectOnSuccess) {
        window.location.href = result.redirectTo;
      }
    } catch (submitError) {
      setError(
        formatAuthError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo iniciar sesión.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneCompletion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await completeCustomerPhone({
        storeSlug,
        nextPath,
        phone,
        displayName: displayName.trim() || suggestedDisplayName,
        orderId,
        documentId,
        businessName,
        city,
        state: stateRegion,
        socialUrl,
      });

      if (!result.ok) {
        setError(formatAuthError(result.error));
        return;
      }

      onRegistered?.({
        displayName: (displayName.trim() || suggestedDisplayName || "").trim(),
        phone: phone.trim() || null,
        contactEmail: result.contactEmail ?? null,
      });

      if (redirectOnSuccess) {
        window.location.href = result.redirectTo;
      }
    } catch (submitError) {
      setError(
        formatAuthError(
          submitError instanceof Error
            ? submitError.message
            : "No se pudo continuar.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading;
  const isCatalog = variant === "catalog";
  const shellClass = isCatalog
    ? "catalog-register-panel"
    : "card-panel mx-auto w-full max-w-lg";

  if (needsPhoneCompletion) {
    return (
      <div className={shellClass}>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {storeName}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
          Completa tu verificación
        </h2>
        <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
          Necesitamos estos datos para proteger la tienda de registros
          fraudulentos.
        </p>

        <form
          onSubmit={(e) => void handlePhoneCompletion(e)}
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="register_display_name_complete" className="label-field">
              Nombre y Apellido
            </label>
            <input
              id="register_display_name_complete"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={displayName}
              disabled={isBusy}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="Nombre y apellido"
            />
          </div>

          <CustomerVerificationFields
            {...verificationFieldProps}
            idPrefix="register_complete"
          />

          {error ? (
            <p className="alert-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={isBusy} className="btn-primary w-full">
            {loading ? "Guardando…" : "Guardar y continuar"}
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
              Entra con Google o con tu correo y contraseña.
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Entra con Google o con tu correo y contraseña.
          </p>
        )}

        <GoogleSignInButton
          postAuthPath={nextPath}
          storeSlug={storeSlug}
          orderId={orderId ?? undefined}
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
            o con correo
          </p>
        </div>

        <form onSubmit={(e) => void handleLoginSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="email_login" className="label-field">
              Correo electrónico
            </label>
            <input
              id="email_login"
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={isBusy}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@correo.com"
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
              disabled={isBusy}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
            />
          </div>

          {error ? (
            <p className="alert-error" role="alert">
              {error}
            </p>
          ) : null}

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
              Regístrate con correo y datos de verificación.
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
            Completa tus datos de verificación para unirte a {storeName}.
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Completa tus datos de verificación para crear tu cuenta.
        </p>
      )}

      <form onSubmit={(e) => void handleQuickSubmit(e)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="register_display_name" className="label-field">
            Nombre y Apellido
          </label>
          <input
            id="register_display_name"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={displayName}
            disabled={isBusy}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="Nombre y apellido"
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Datos de verificación
        </p>

        <CustomerVerificationFields
          {...verificationFieldProps}
          idPrefix="register"
        />

        <div>
          <label htmlFor="register_email" className="label-field">
            Correo electrónico
          </label>
          <input
            id="register_email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={isBusy}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="tu@correo.com"
          />
        </div>

        <div>
          <label htmlFor="register_password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="register_password"
            name="password"
            autoComplete="new-password"
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            value={password}
            disabled={isBusy}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Mínimo ${CUSTOMER_MIN_PASSWORD_LENGTH} caracteres`}
          />
        </div>

        {error ? (
          <p className="alert-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={isBusy} className="btn-primary w-full">
          {loading ? "Creando cuenta…" : `Unirme a ${storeName}`}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
        </div>
        <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
          o continúa con
        </p>
      </div>

      <GoogleSignInButton
        postAuthPath={googleCompletionPath}
        storeSlug={storeSlug}
        orderId={orderId ?? undefined}
        disabled={isBusy}
        buttonClassName="rounded-[10px] border-zinc-200/80 py-3.5 font-semibold shadow-[0_1px_2px_rgba(24,24,27,0.04)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
        onError={(message) => setError(formatAuthError(message))}
      />
      <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Con Google te pediremos completar la verificación después.
      </p>

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
          <span>Inicia sesión con Google o con correo y contraseña.</span>
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
