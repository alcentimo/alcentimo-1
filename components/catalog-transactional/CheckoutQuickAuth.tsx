"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { quickRegisterOrSignInCustomerInline } from "@/lib/customers/register-actions";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CUSTOMER_MIN_PASSWORD_LENGTH } from "@/lib/customers/phone-auth";

interface CheckoutQuickAuthProps {
  storeSlug: string;
  variant?: "checkout" | "postPurchase";
  orderId?: string | null;
  initialDisplayName?: string;
  initialEmail?: string;
  onAuthenticated: (profile: {
    displayName: string;
    phone?: string | null;
    contactEmail?: string | null;
    deliveryAddress?: string | null;
    preferredShippingMethod?: string | null;
    preferredShippingBranchCode?: string | null;
  }) => void;
}

/** Registro opcional post-compra: nombre + correo + contraseña. */
export function CheckoutQuickAuth({
  storeSlug,
  variant = "checkout",
  orderId = null,
  initialDisplayName = "",
  initialEmail = "",
  onAuthenticated,
}: CheckoutQuickAuthProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
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
      method: "email",
      email,
      password,
      orderId,
    });

    setPending(false);

    if (!result.ok) {
      setError(formatAuthError(result.error));
      return;
    }

    onAuthenticated({
      displayName: result.displayName,
      phone: result.phone?.trim() || null,
      contactEmail: result.contactEmail?.trim() || email.trim() || null,
      deliveryAddress: result.deliveryAddress ?? null,
      preferredShippingMethod: result.preferredShippingMethod ?? null,
      preferredShippingBranchCode: result.preferredShippingBranchCode ?? null,
    });
  }

  return (
    <div className="txn-checkout-quick-auth">
      <p className="txn-checkout-section-title">
        {isPostPurchase ? "Crear cuenta (opcional)" : "Accede en segundos"}
      </p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {isPostPurchase
          ? "Nombre y apellido, correo y contraseña. Puedes saltarte este paso."
          : "Nombre y apellido, correo y contraseña."}
      </p>

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
        <label className="txn-field">
          <span>Correo electrónico</span>
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
        <label className="txn-field">
          <span>Contraseña</span>
          <PasswordInput
            required
            minLength={CUSTOMER_MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="txn-input !mt-0"
            placeholder={`Mínimo ${CUSTOMER_MIN_PASSWORD_LENGTH} caracteres`}
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
            "Crear cuenta y guardar"
          ) : (
            "Continuar"
          )}
        </button>
      </form>
    </div>
  );
}
