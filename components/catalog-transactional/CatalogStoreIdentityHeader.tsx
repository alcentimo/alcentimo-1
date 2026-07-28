"use client";

import Image from "next/image";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { formatExchangeRate } from "@/lib/format";
import type { LocationHoursSettings } from "@/lib/store-settings/types";

interface CatalogStoreIdentityHeaderProps {
  storeName: string;
  storeDescription?: string | null;
  logoUrl?: string | null;
  /** Etiqueta corta del rubro (Menú, Tech, Catálogo…). */
  eyebrow?: string;
  locationHours?: LocationHoursSettings | null;
  showOfficialRate?: boolean;
  exchangeRate?: number | null;
}

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

/**
 * Cabecera de identidad del catálogo público (`/c/...`).
 * Misma tarjeta para todas las tiendas: nombre, descripción y tasa BCV.
 */
export function CatalogStoreIdentityHeader({
  storeName,
  storeDescription = null,
  logoUrl = null,
  eyebrow = "Catálogo",
  locationHours = null,
  showOfficialRate = false,
  exchangeRate = null,
}: CatalogStoreIdentityHeaderProps) {
  const initials = getStoreInitials(storeName);
  const description = storeDescription?.trim() || null;
  const showRate =
    showOfficialRate &&
    exchangeRate != null &&
    Number.isFinite(exchangeRate) &&
    exchangeRate > 0;

  return (
    <header className="txn-catalog-header">
      <div className="txn-catalog-header-inner">
        <div className="txn-catalog-identity-card">
          <div className="txn-catalog-brand">
            {logoUrl ? (
              <div className="txn-store-logo">
                <Image
                  src={logoUrl}
                  alt={`Logo de ${storeName}`}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="txn-store-logo-fallback" aria-hidden="true">
                {initials}
              </div>
            )}

            <div className="txn-catalog-identity-copy">
              <div className="txn-catalog-identity-meta">
                <p className="txn-catalog-eyebrow">{eyebrow}</p>
                {locationHours ? (
                  <StoreOpenBadge locationHours={locationHours} />
                ) : null}
              </div>

              <h1 className="txn-catalog-title">{storeName}</h1>

              {description ? (
                <p className="txn-catalog-desc">{description}</p>
              ) : null}

              {showRate ? (
                <p className="txn-catalog-rate-badge">
                  <span className="txn-catalog-rate-badge-label">Tasa BCV</span>
                  <span className="txn-catalog-rate-badge-value">
                    Bs. {formatExchangeRate(exchangeRate)} / USD
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
