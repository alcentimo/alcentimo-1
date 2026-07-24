import Link from "next/link";
import {
  ArrowRight,
  Globe,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const benefits = [
  {
    icon: ImageIcon,
    title: "Tu propio logo",
    description:
      "Personaliza tu catálogo y panel con la imagen de tu marca. Tus clientes ven tu negocio, no una plataforma genérica.",
    accent: "emerald",
  },
  {
    icon: Globe,
    title: "Dominio propio (.com)",
    description:
      "Conecta tu dirección web personalizada para que tus clientes te recuerden siempre. Disponible en planes Business y Enterprise.",
    accent: "violet",
    badge: "Business+",
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(139,92,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(139,92,246,0.06),transparent)]"
        aria-hidden="true"
      />

      <div className="page-container relative">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Marca blanca
          </Badge>
          <h2 className="section-title text-balance">
            Vende con{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              tu propia identidad digital
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Con Alcentimo tu tienda deja de verse genérica. Tus clientes entran a
            un catálogo con tu logo, tus colores y tu dominio — como si hubieras
            contratado un desarrollo a medida.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {benefits.map(({ icon: Icon, title, description, accent, ...rest }) => {
            const badge = "badge" in rest ? rest.badge : undefined;
            return (
            <Card
              key={title}
              className={cn(
                "h-full border-zinc-200/70 bg-[#FAFAF9] shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/40",
                accent === "violet" &&
                  "ring-1 ring-violet-200/60 dark:ring-violet-900/40",
              )}
            >
              <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                      accent === "emerald"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  {badge ? (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              </CardContent>
            </Card>
            );
          })}
        </div>

        <div className="landing-whitelabel-showcase mx-auto mt-16 max-w-5xl">
          <div className="landing-whitelabel-showcase-header">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              De genérico a 100% profesional
            </p>
          </div>

          <div className="landing-whitelabel-showcase-grid">
            <div className="landing-whitelabel-showcase-col">
              <span className="landing-whitelabel-showcase-label landing-whitelabel-showcase-label-before">
                Antes
              </span>
              <StorePreview variant="generic" />
              <p className="landing-whitelabel-showcase-caption">
                Subdominio de plataforma · identidad genérica
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
                Logo propio · dominio .com · imagen profesional
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="#precios"
            className="btn-brand inline-flex gap-2 px-6 py-2.5 text-sm shadow-md shadow-emerald-500/15"
          >
            Ver planes con marca blanca
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
