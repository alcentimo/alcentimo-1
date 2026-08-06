import Image from "next/image";
import { cn } from "@/lib/cn";

interface HeroCatalogStaticPreviewProps {
  className?: string;
}

const FLOATING_LABELS = [
  {
    id: "bcv",
    text: "Tasa BCV",
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

/** Mockup estático ultraligero del catálogo (sin sandbox ni JS de catálogo). */
export function HeroCatalogStaticPreview({
  className,
}: HeroCatalogStaticPreviewProps) {
  return (
    <div className={cn("landing-hero-phone", className)}>
      <div className="landing-hero-phone-stage">
        {FLOATING_LABELS.map((label) => (
          <span key={label.id} className={label.className} aria-hidden="true">
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
          </div>
        </div>
      </div>

      <p className="landing-hero-phone-caption">
        Así ven tus clientes el catálogo · Demo Boutique Luna
      </p>
    </div>
  );
}
