import type { ShippingCarrierKey } from "@/lib/store-settings/types";

interface ShippingCarrierLogoProps {
  carrierKey: ShippingCarrierKey;
  className?: string;
}

/** Marcas estilizadas (iniciales/colores) — sin dependencia de APIs externas. */
export function ShippingCarrierLogo({
  carrierKey,
  className = "h-10 w-10",
}: ShippingCarrierLogoProps) {
  switch (carrierKey) {
    case "mrw":
      return (
        <svg
          viewBox="0 0 40 40"
          className={className}
          aria-hidden="true"
          role="img"
        >
          <rect width="40" height="40" rx="10" fill="#E30613" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            MRW
          </text>
        </svg>
      );
    case "tealca":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0054A6" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="9"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            TEALCA
          </text>
        </svg>
      );
    case "zoom":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#F7941D" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#1A1A1A"
            fontSize="12"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            ZOOM
          </text>
        </svg>
      );
    case "domesa":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#006B3F" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            DOMESA
          </text>
        </svg>
      );
    case "libertyExpress":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#6B21A8" />
          <text
            x="20"
            y="18"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="7"
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            LIBERTY
          </text>
          <text
            x="20"
            y="28"
            textAnchor="middle"
            fill="#E9D5FF"
            fontSize="6"
            fontWeight="600"
            fontFamily="Arial, Helvetica, sans-serif"
          >
            EXPRESS
          </text>
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0D9488" />
          <path
            d="M8 26h2.5l1.8-5.5H26l2.2 5.5H31l-3.2-8H13.5L11 14H7v12zm8.5 4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zm10 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "pickup":
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#475569" />
          <path
            d="M10 16h20v14H10V16zm3 3v8h5v-8h-5zm7 0v8h5v-8h-5zM14 12h12l2 4H12l2-4z"
            fill="#FFFFFF"
          />
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
