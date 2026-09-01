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
    <div className="card-panel space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Saldo a favor
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Carga una tarjeta de regalo a tu perfil. En el checkout se descuenta
          solo.
        </p>
      </div>
      <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
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
