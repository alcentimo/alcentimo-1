import { ArrowRight, Globe, ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";

const benefits = [
  {
    icon: ImageIcon,
    title: "Tu propio logo",
    description:
      "Tu tienda se ve con tu nombre y tu imagen. Quien compra siente que entra a tu negocio.",
  },
  {
    icon: Globe,
    title: "Tu enlace o dominio",
    description:
      "Comparte un enlace fácil de recordar. También puedes conectar tu dominio .com.",
  },
] as const;

function StorePreview({
  variant,
  className,
}: {
  variant: "generic" | "branded";
  className?: string;
}) {
  const isBranded = variant === "branded";

  return (
    <div
      className={cn(
        "landing-whitelabel-preview",
        isBranded && "landing-whitelabel-preview-branded",
        className,
      )}
    >
      <div className="landing-whitelabel-preview-chrome">
        <span className="landing-dashboard-mockup-dot bg-red-400/90" />
        <span className="landing-dashboard-mockup-dot bg-amber-400/90" />
        <span className="landing-dashboard-mockup-dot bg-emerald-400/90" />
        <span className="landing-whitelabel-preview-url">
          {isBranded ? "www.tutienda.com" : "tuempresa.alcentimo.com"}
        </span>
      </div>

      <div className="landing-whitelabel-preview-body">
        <header className="landing-whitelabel-preview-header">
          <div
            className={cn(
              "landing-whitelabel-preview-logo",
              isBranded
                ? "landing-whitelabel-preview-logo-branded"
                : "landing-whitelabel-preview-logo-generic",
            )}
          >
            {isBranded ? "TM" : "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
              {isBranded ? "Tu Marca" : "Tu Empresa"}
            </p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
              {isBranded ? "Catálogo profesional" : "Catálogo en Alcentimo"}
            </p>
          </div>
        </header>

        <div className="landing-whitelabel-preview-grid">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="landing-whitelabel-preview-product">
              <div
                className={cn(
                  "landing-whitelabel-preview-product-img",
                  isBranded && "landing-whitelabel-preview-product-img-branded",
                )}
              />
              <div className="landing-whitelabel-preview-product-line" />
              <div className="landing-whitelabel-preview-product-line landing-whitelabel-preview-product-line-short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingWhiteLabel() {
  return (
    <section
      id="marca-blanca"
      className="section-padding relative overflow-hidden border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.06),transparent)]"
        aria-hidden="true"
      />

      <div className="page-container relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Tu marca</p>
          <h2 className="section-title text-balance">
            Tu negocio, con{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              tu nombre
            </span>
          </h2>
          <p className="section-subtitle mx-auto">
            Sin diseño ni desarrollo: tu logo y tu identidad desde el primer día.
          </p>
        </div>

        <ul className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-12">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title} className="text-center sm:text-left">
              <div className="landing-benefit-icon mx-auto sm:mx-0">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            </li>
          ))}
        </ul>

        <div className="landing-whitelabel-showcase mx-auto mt-16 max-w-5xl">
          <div className="landing-whitelabel-showcase-grid">
            <div className="landing-whitelabel-showcase-col">
              <span className="landing-whitelabel-showcase-label landing-whitelabel-showcase-label-before">
                Antes
              </span>
              <StorePreview variant="generic" />
              <p className="landing-whitelabel-showcase-caption">
                Subdominio de plataforma
              </p>
            </div>

            <div className="landing-whitelabel-showcase-arrow" aria-hidden="true">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="landing-whitelabel-showcase-col">
              <span className="landing-whitelabel-showcase-label landing-whitelabel-showcase-label-after">
                Tu marca
              </span>
              <StorePreview variant="branded" />
              <p className="landing-whitelabel-showcase-caption">
                Logo propio · dominio .com
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 text-center">
          <a
            href={MERCHANT_SIGNUP_HREF}
            className="btn-brand-outline inline-flex gap-2 px-6 py-2.5 text-sm"
          >
            Quiero vender
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
