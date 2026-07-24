"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { quickRegisterOrSignInCustomerInline } from "@/lib/customers/register-actions";

interface CheckoutQuickAuthProps {
  storeSlug: string;
  onAuthenticated: (profile: {
    displayName: string;
    phone: string;
    deliveryAddress?: string | null;
    preferredShippingMethod?: string | null;
    preferredShippingBranchCode?: string | null;
  }) => void;
}

/** Registro / acceso instantáneo sin salir del checkout. */
export function CheckoutQuickAuth({
  storeSlug,
  onAuthenticated,
}: CheckoutQuickAuthProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await quickRegisterOrSignInCustomerInline({
      storeSlug,
      displayName,
      phone,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onAuthenticated({
      displayName: result.displayName,
      phone: result.phone,
      deliveryAddress: result.deliveryAddress ?? null,
      preferredShippingMethod: result.preferredShippingMethod ?? null,
      preferredShippingBranchCode: result.preferredShippingBranchCode ?? null,
    });
  }

  return (
    <div className="txn-checkout-quick-auth">
      <p className="txn-checkout-section-title">Accede en segundos</p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Usa tu WhatsApp: la próxima vez autocompletamos tus datos y guardamos tu
        dirección.
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
          <span>WhatsApp</span>
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
        {error ? (
          <p className="txn-checkout-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="txn-promo-apply-btn w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Entrando…
            </>
          ) : (
            "Continuar con mi WhatsApp"
          )}
        </button>
      </form>
    </div>
  );
}
