import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatExchangeRate } from "@/lib/format";

interface HeroCatalogStaticPreviewProps {
  className?: string;
  /** Tasa BCV vigente (misma fuente que el catálogo / dashboard). */
  exchangeRate?: number | null;
}

/** Mockup estático ultraligero del catálogo (sin sandbox ni JS de catálogo). */
export function HeroCatalogStaticPreview({
  className,
  exchangeRate = null,
}: HeroCatalogStaticPreviewProps) {
  const rateLabel =
    exchangeRate != null && Number.isFinite(exchangeRate) && exchangeRate > 0
      ? `Bs. ${formatExchangeRate(exchangeRate)}`
      : null;

  const floatingLabels = [
    {
      id: "bcv",
      text: rateLabel ? `Tasa BCV · ${rateLabel}` : "Tasa BCV",
      className: "landing-hero-phone-float landing-hero-phone-float-bcv",
    },
    {
      id: "ai",
      text: "Asistente IA",
      className: "landing-hero-phone-float landing-hero-phone-float-ai",
    },
    {
      id: "wa",
      text: "Conexión WhatsApp",
      className: "landing-hero-phone-float landing-hero-phone-float-wa",
    },
  ] as const;

  return (
    <div className={cn("landing-hero-phone", className)}>
      <div className="landing-hero-phone-stage">
        {floatingLabels.map((label) => (
          <span key={label.id} className={label.className}>
            {label.text}
          </span>
        ))}

        <div className="landing-hero-phone-device">
          <div className="landing-hero-phone-notch" aria-hidden="true" />
          <div className="landing-hero-phone-screen">
            <Image
              src="/images/landing/catalog-phone-preview.webp"
              alt="Vista previa del catálogo público de Alcentimo en un teléfono"
              width={780}
              height={1648}
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 1024px) 72vw, 340px"
              className="landing-hero-phone-image"
            />
            {rateLabel ? (
              <div
                className="landing-hero-phone-rate-overlay"
                aria-live="polite"
                aria-label={`Tasa BCV vigente: 1 USD = ${rateLabel}`}
              >
                <span className="landing-hero-phone-rate-overlay-label">BCV</span>
                <span className="landing-hero-phone-rate-overlay-value">
                  1 USD = {rateLabel}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className="landing-hero-phone-caption">
        Así ven tus clientes el catálogo · Demo Boutique Luna
        {rateLabel ? ` · ${rateLabel} / USD` : ""}
      </p>
    </div>
  );
}
