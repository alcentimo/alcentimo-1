import type { PaymentMethodKey } from "@/lib/store-settings/types";

interface PaymentMethodLogoProps {
  methodKey: PaymentMethodKey;
  className?: string;
}

/** Marcas e iconos estilizados — sin dependencia de APIs externas. */
export function PaymentMethodLogo({
  methodKey,
  className = "h-10 w-10",
}: PaymentMethodLogoProps) {
  switch (methodKey) {
    case "pagoMovil":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#1D4ED8" />
          <rect x="12" y="9" width="16" height="22" rx="3" fill="#FFFFFF" />
          <rect x="14" y="12" width="12" height="8" rx="1.5" fill="#BFDBFE" />
          <circle cx="20" cy="27" r="1.5" fill="#1D4ED8" />
        </svg>
      );
    case "zelle":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#6D1ED4" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            Zelle
          </text>
        </svg>
      );
    case "cashea":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#F59E0B" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#1A1A1A"
            fontSize="9.5"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            cashea
          </text>
        </svg>
      );
    case "transferencia":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0F766E" />
          <path
            d="M10 14h20v4H10v-4zm0 8h14v4H10v-4zm16 0h4v8h-4v-8zM14 10h12v3H14v-3z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "efectivoUsd":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#15803D" />
          <rect x="9" y="13" width="22" height="14" rx="2" fill="#DCFCE7" />
          <text
            x="20"
            y="23"
            textAnchor="middle"
            fill="#15803D"
            fontSize="12"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            $
          </text>
        </svg>
      );
    case "puntoVenta":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#334155" />
          <rect x="10" y="12" width="20" height="16" rx="2" fill="#E2E8F0" />
          <rect x="13" y="15" width="14" height="5" rx="1" fill="#334155" />
          <rect x="15" y="23" width="10" height="2" rx="1" fill="#94A3B8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#71717A" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            ?
          </text>
        </svg>
      );
  }
}
