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

  const verificationFields = (
    <>
      <div>
        <label htmlFor="document_id" className="label-field">
          Cédula de Identidad / RIF
        </label>
        <input
          id="document_id"
          type="text"
          autoComplete="off"
          required
          value={documentId}
          disabled={isBusy}
          onChange={(e) => setDocumentId(e.target.value)}
          className="input-field"
          placeholder="V-12345678 o J-123456789"
        />
      </div>

      <div>
        <label htmlFor="phone_required" className="label-field">
          Número de WhatsApp / Teléfono
        </label>
        <input
          id="phone_required"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          disabled={isBusy}
          onChange={(e) => setPhone(e.target.value)}
          className="input-field"
          placeholder="0412… o 412…"
        />
      </div>

      <div>
        <label htmlFor="business_name" className="label-field">
          Nombre de la tienda
        </label>
        <input
          id="business_name"
          type="text"
          autoComplete="organization"
          required
          minLength={2}
          value={businessName}
          disabled={isBusy}
          onChange={(e) => setBusinessName(e.target.value)}
          className="input-field"
          placeholder="Tu tienda o negocio"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="label-field">
            Ciudad
          </label>
          <input
            id="city"
            type="text"
            autoComplete="address-level2"
            required
            minLength={2}
            value={city}
            disabled={isBusy}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
            placeholder="Caracas"
          />
        </div>
        <div>
          <label htmlFor="state_region" className="label-field">
            Estado
          </label>
          <input
            id="state_region"
            type="text"
            autoComplete="address-level1"
            required
            minLength={2}
            value={stateRegion}
            disabled={isBusy}
            onChange={(e) => setStateRegion(e.target.value)}
            className="input-field"
            placeholder="Distrito Capital"
          />
        </div>
      </div>

      <div>
        <label htmlFor="social_url" className="label-field">
          Enlace de red social
        </label>
        <input
          id="social_url"
          type="text"
          autoComplete="url"
          required
          value={socialUrl}
          disabled={isBusy}
          onChange={(e) => setSocialUrl(e.target.value)}
          className="input-field"
          placeholder="@tu.tienda o instagram.com/tu.tienda"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Instagram u otro perfil comercial para verificar tu identidad.
        </p>
      </div>
    </>
  );

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
            <label htmlFor="display_name_complete" className="label-field">
              Nombre y Apellido
            </label>
            <input
              id="display_name_complete"
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

          {verificationFields}

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
              Regístrate con Google o con correo y contraseña.
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

      <GoogleSignInButton
        postAuthPath={googleCompletionPath}
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

      <form onSubmit={(e) => void handleQuickSubmit(e)} className="space-y-4">
        <div>
          <label htmlFor="display_name" className="label-field">
            Nombre y Apellido
          </label>
          <input
            id="display_name"
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

        {verificationFields}

        <div>
          <label htmlFor="email" className="label-field">
            Correo electrónico
          </label>
          <input
            id="email"
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
          <label htmlFor="password" className="label-field">
            Contraseña
          </label>
          <PasswordInput
            id="password"
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
