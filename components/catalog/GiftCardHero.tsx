"use client";

import { formatUsd } from "@/lib/format";

export function GiftCardHero({
  amountUsd,
  storeName,
}: {
  amountUsd: number;
  storeName: string;
}) {
  return (
    <div className="gift-card-hero">
      <div className="gift-card-hero-card">
        <p className="gift-card-hero-brand">{storeName}</p>
        <p className="gift-card-hero-label">Tarjeta de regalo</p>
        <p className="gift-card-hero-amount">{formatUsd(amountUsd)}</p>
        <p className="gift-card-hero-note">Entrega digital por correo</p>
      </div>
    </div>
  );
}
