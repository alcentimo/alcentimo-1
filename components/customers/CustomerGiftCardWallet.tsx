"use client";

import { useState, useTransition } from "react";
import { applyGiftCardToWallet } from "@/lib/gift-cards/wallet-actions";
import { useGiftCardStorefront } from "@/components/catalog-transactional/GiftCardStorefrontProvider";
import { formatUsd } from "@/lib/format";

export function CustomerGiftCardWallet({ storeSlug }: { storeSlug: string }) {
  const { enabled, storeCreditUsd, setStoreCreditUsd } = useGiftCardStorefront();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!enabled) return null;

  function handleRedeem() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await applyGiftCardToWallet(storeSlug, code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStoreCreditUsd(result.balanceUsd ?? 0);
      setCode("");
      setMessage(
        `Se abonaron ${formatUsd(result.creditedUsd ?? 0)} a tu cuenta. Saldo: ${formatUsd(result.balanceUsd ?? 0)}.`,
      );
    });
  }

  return (
    <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/90 p-4 space-y-4 shadow-sm dark:border-teal-800 dark:bg-teal-950/30">
      <div>
        <h2 className="text-base font-semibold text-teal-950 dark:text-teal-50">
          Canjear tarjeta de regalo
        </h2>
        <p className="mt-1 text-xs text-teal-800/80 dark:text-teal-200/80">
          Ingresa el código para abonar el saldo a tu cuenta. En el checkout se
          descuenta automáticamente.
        </p>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-teal-950 dark:text-teal-50">
        {formatUsd(storeCreditUsd)}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="GC-XXXX-XXXX"
          className="input-field flex-1 uppercase"
          autoComplete="off"
          disabled={pending}
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={!code.trim() || pending}
          className="btn-primary shrink-0 px-3 text-sm"
        >
          {pending ? "…" : "Abonar"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {message ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}
    </div>
  );
}
