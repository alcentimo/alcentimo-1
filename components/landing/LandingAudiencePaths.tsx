import Link from "next/link";
import { ArrowRight, Package, Store } from "lucide-react";
import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_ZONE_HREF } from "@/lib/landing/supplier-zone-href";

const paths = [
  {
    href: MERCHANT_SIGNUP_HREF,
    icon: Store,
    eyebrow: "Tiendas",
    title: "Quiero vender (Dropshipping)",
    description:
      "Crea tu tienda, elige productos del catálogo y vende sin inventario ni logística.",
    cta: "Registrar mi tienda",
    accent: "merchant" as const,
  },
  {
    href: SUPPLIER_ZONE_HREF,
    icon: Package,
    eyebrow: "Mayoristas",
    title: "Soy Proveedor / Mayorista",
    description:
      "Publica tu catálogo una vez y llega a tiendas listas para revender tus productos.",
    cta: "Registrar como proveedor",
    accent: "supplier" as const,
  },
] as const;

/** Tarjeta doble para elegir entre vender (tienda) o ser proveedor. */
export function LandingAudiencePaths() {
  return (
    <section
      id="para-quien"
      className="border-b border-zinc-200/60 bg-white py-14 sm:py-16 lg:py-20 dark:border-zinc-800/60 dark:bg-zinc-950"
      aria-labelledby="landing-audience-heading"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="landing-audience-label">Empieza aquí</p>
          <h2
            id="landing-audience-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50"
          >
            ¿Qué quieres hacer en Alcéntimo?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Elige tu camino. Cada opción te lleva al registro correcto, sin
            mezclar paneles.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:gap-6">
          {paths.map((path) => {
            const Icon = path.icon;
            return (
              <Link
                key={path.href}
                href={path.href}
                prefetch={true}
                className={`landing-audience-card landing-audience-card-${path.accent} landing-audience-path group`}
              >
                <span
                  className={`landing-audience-card-icon landing-audience-card-icon-${path.accent}`}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="landing-audience-label mt-5">{path.eyebrow}</p>
                <h3 className="landing-audience-card-title">{path.title}</h3>
                <p className="landing-audience-card-copy">{path.description}</p>
                <span className="landing-audience-card-cta">
                  {path.cta}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
