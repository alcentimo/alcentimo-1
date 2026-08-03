"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { StoreOpenBadge } from "@/components/catalog/StoreOpenBadge";
import { useCatalogShellNavigationOptional } from "@/components/catalog-transactional/CatalogShellNavigation";
import { formatExchangeRate } from "@/lib/format";
import { isGifImageUrl } from "@/lib/media/is-gif-url";
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
  const shellNav = useCatalogShellNavigationOptional();
  const showAssistant = Boolean(shellNav?.assistantAvailable);
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
                  sizes="40px"
                  className="object-cover"
                  unoptimized={isGifImageUrl(logoUrl)}
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
                <p className="txn-catalog-desc" title={description}>
                  {description}
                </p>
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

          {showAssistant ? (
            <button
              type="button"
              className="txn-catalog-assistant-btn"
              aria-label="Abrir asistente de la tienda"
              onClick={() => shellNav?.openAssistant()}
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Ayuda</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
