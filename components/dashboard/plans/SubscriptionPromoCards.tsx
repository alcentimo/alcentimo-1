"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  dismissPromoOffer,
  redeemSubscriptionCouponCode,
} from "@/lib/plans/subscription-promo-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PromoOfferBannerProps {
  offers: Array<{
    id: string;
    title: string;
    message: string;
    coupon_id: string | null;
  }>;
}

export function PromoOfferBanner({ offers }: PromoOfferBannerProps) {
  const [items, setItems] = useState(offers);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((offer) => (
        <div
          key={offer.id}
          className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 dark:border-teal-900/50 dark:bg-teal-950/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                {offer.title}
              </p>
              <p className="mt-1 text-sm text-teal-800/90 dark:text-teal-200/90">
                {offer.message}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await dismissPromoOffer(offer.id);
                  setItems((prev) => prev.filter((row) => row.id !== offer.id));
                })
              }
            >
              Cerrar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SubscriptionCouponRedeemCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await redeemSubscriptionCouponCode(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(
        result.days
          ? `¡Listo! Activamos Pro por ${result.days} días.`
          : "Cupón canjeado.",
      );
      setCode("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        ¿Tienes un cupón?
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Códigos que regalan días Pro se canjean aquí. Los de descuento se usan
        al reportar el pago.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="sub-coupon">Código</Label>
          <Input
            id="sub-coupon"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="NAVIDAD2026"
            className="mt-1.5"
            disabled={pending}
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending ? "Canjeando…" : "Canjear"}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      ) : null}
    </form>
  );
}
