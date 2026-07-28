"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { quickRegisterOrSignInCustomerInline } from "@/lib/customers/register-actions";
import {
  CUSTOMER_MIN_PASSWORD_LENGTH,
  type CustomerAuthMethod,
} from "@/lib/customers/phone-auth";

interface CheckoutQuickAuthProps {
  storeSlug: string;
  variant?: "checkout" | "postPurchase";
  orderId?: string | null;
  initialDisplayName?: string;
  initialPhone?: string;
  onAuthenticated: (profile: {
    displayName: string;
    phone: string;
    deliveryAddress?: string | null;
    preferredShippingMethod?: string | null;
    preferredShippingBranchCode?: string | null;
  }) => void;
}

/** Registro / acceso con teléfono o correo + contraseña sin salir del checkout. */
export function CheckoutQuickAuth({
  storeSlug,
  variant = "checkout",
  orderId = null,
  initialDisplayName = "",
  initialPhone = "",
  onAuthenticated,
}: CheckoutQuickAuthProps) {
  const [authMethod, setAuthMethod] = useState<CustomerAuthMethod>("phone");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isPostPurchase = variant === "postPurchase";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await quickRegisterOrSignInCustomerInline({
      storeSlug,
      displayName,
      method: authMethod,
      phone: authMethod === "phone" ? phone : phone.trim() || null,
      email: authMethod === "email" ? email : null,
      password,
      confirmPassword,
      orderId,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onAuthenticated({
      displayName: result.displayName,
      phone: result.phone?.trim() || phone.trim() || "",
      deliveryAddress: result.deliveryAddress ?? null,
      preferredShippingMethod: result.preferredShippingMethod ?? null,
      preferredShippingBranchCode: result.preferredShippingBranchCode ?? null,
    });
  }

  return (
    <div className="txn-checkout-quick-auth">
      <p className="txn-checkout-section-title">
        {isPostPurchase ? "Guardar mi cuenta" : "Accede en segundos"}
      </p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {isPostPurchase
          ? "Teléfono o correo, más una contraseña para guardar tus datos."
          : "Elige teléfono o correo y tu contraseña. Sin SMS."}
      </p>

      <div className="catalog-auth-method-toggle mb-3" role="group" aria-label="Método de acceso">
        <button
          type="button"
          disabled={pending}
          className={
            authMethod === "phone"
              ? "catalog-auth-method-btn catalog-auth-method-btn-active"
              : "catalog-auth-method-btn"
          }
          onClick={() => setAuthMethod("phone")}
        >
          Teléfono
        </button>
        <button
          type="button"
          disabled={pending}
          className={
            authMethod === "email"
              ? "catalog-auth-method-btn catalog-auth-method-btn-active"
              : "catalog-auth-method-btn"
          }
          onClick={() => setAuthMethod("email")}
        >
          Correo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="txn-field">
          <span>Nombre</span>
          <input
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="txn-input"
            placeholder="Tu nombre"
          />
        </label>
        {authMethod === "phone" ? (
          <label className="txn-field">
            <span>Teléfono</span>
            <input
              type="tel"
              required
              minLength={10}
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="txn-input"
              placeholder="0412 1234567"
            />
          </label>
        ) : (
          <label className="txn-field">
            <span>Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="txn-input"
              placeholder="tu@correo.com"
            />
          </label>
        )}
        <label className="txn-field">
          <span>Contraseña</span>
          <input
            type="password"
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="txn-input"
            placeholder={`Mínimo ${CUSTOMER_MIN_PASSWORD_LENGTH} caracteres`}
          />
        </label>
        <label className="txn-field">
          <span>Confirmar contraseña</span>
          <input
            type="password"
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="txn-input"
            placeholder="Repite la contraseña"
          />
        </label>
        {error ? (
          <p className="txn-checkout-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="txn-promo-apply-btn w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isPostPurchase ? "Guardando…" : "Entrando…"}
            </>
          ) : isPostPurchase ? (
            "Guardar mis datos"
          ) : (
            "Continuar"
          )}
        </button>
      </form>
    </div>
  );
}
