import Link from "next/link";
import {
  Check,
  Crown,
  Headphones,
  ImageIcon,
  Package,
  Rocket,
  Sparkles,
  Store,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";

interface PricingGridProps {
  exchangeRate: number | null;
}

interface PlanFeature {
  text: string;
  icon: LucideIcon;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  icon: LucideIcon;
  popular?: boolean;
  cta: string;
  ctaHref: string;
  features: PlanFeature[];
}

function toVes(usd: number, rate: number | null): string {
  if (rate == null) return "—";
  return formatVes(usd * rate);
}

export function PricingGrid({ exchangeRate }: PricingGridProps) {
  const plans: Plan[] = [
    {
      id: "inicio",
      name: "Inicio",
      description: "Para emprendedores que arrancan su catálogo digital.",
      priceUsd: 0,
      icon: Sparkles,
      cta: "Empezar gratis",
      ctaHref: "/dashboard/productos/nuevo",
      features: [
        { text: "Hasta 25 productos activos", icon: Package },
        { text: "Catálogo público con enlace único", icon: Store },
        { text: "Precios USD + Bs automáticos", icon: Tag },
        { text: "Imágenes comprimidas para móvil", icon: ImageIcon },
        { text: "1 usuario", icon: Users },
      ],
    },
    {
      id: "profesional",
      name: "Profesional",
      description: "Para negocios en crecimiento que venden todos los días.",
      priceUsd: 9.99,
      icon: Rocket,
      popular: true,
      cta: "Elegir Profesional",
      ctaHref: "/dashboard/productos/nuevo",
      features: [
        { text: "Productos ilimitados", icon: Package },
        { text: "Categorías personalizadas", icon: Tag },
        { text: "Productos destacados", icon: Zap },
        { text: "Soporte prioritario por email", icon: Headphones },
        { text: "Hasta 3 usuarios", icon: Users },
        { text: "Sin marca alcentimo en catálogo", icon: Store },
      ],
    },
    {
      id: "negocio",
      name: "Negocio",
      description: "Para tiendas con inventario grande y equipo de ventas.",
      priceUsd: 24.99,
      icon: Crown,
      cta: "Contactar ventas",
      ctaHref: "/dashboard/login",
      features: [
        { text: "Todo lo de Profesional", icon: Check },
        { text: "Usuarios ilimitados", icon: Users },
        { text: "Roles admin y vendedor", icon: Users },
        { text: "Historial de inventario", icon: Package },
        { text: "Onboarding personalizado", icon: Headphones },
        { text: "Soporte dedicado", icon: Headphones },
      ],
    },
  ];

  return (
    <section id="precios" className="section-padding bg-zinc-100/50 dark:bg-zinc-900/30">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Planes y precios</p>
          <h2 className="section-title">
            Invierte en tu negocio, no en complicaciones
          </h2>
          <p className="section-subtitle mx-auto">
            Suscripción en dólares con equivalente en bolívares al tipo de cambio
            del día. Tus clientes siempre ven ambos montos en el catálogo.
          </p>
          {exchangeRate != null && (
            <div className="mt-6 flex justify-center">
              <span className="price-rate-badge gap-1.5 px-3 py-1.5">
                Tasa referencial: Bs. {formatExchangeRate(exchangeRate)} / USD
              </span>
            </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.popular === true;

            return (
              <article
                key={plan.id}
                className={`pricing-card relative flex flex-col ${
                  isPopular ? "pricing-card-popular" : "card-surface"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold tracking-wide text-white shadow-sm dark:bg-teal-500 dark:text-zinc-950">
                    Más popular
                  </span>
                )}

                <div className="flex items-start gap-3 p-6 pb-0 sm:p-8 sm:pb-0">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                      isPopular
                        ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-zinc-950"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className="mx-6 my-6 rounded-xl border border-zinc-100 bg-zinc-50 p-5 sm:mx-8 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-baseline gap-1.5">
                    <span className="price-usd text-4xl">
                      {plan.priceUsd === 0 ? "Gratis" : formatUsd(plan.priceUsd)}
                    </span>
                    {plan.priceUsd > 0 && (
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        /mes
                      </span>
                    )}
                  </div>
                  <p className="price-ves mt-2 text-base">
                    {plan.priceUsd === 0
                      ? "Sin costo mensual"
                      : `≈ ${toVes(plan.priceUsd, exchangeRate)}/mes`}
                  </p>
                  {plan.priceUsd > 0 && exchangeRate != null && (
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Calculado a Bs. {formatExchangeRate(exchangeRate)} / USD
                    </p>
                  )}
                </div>

                <ul className="flex flex-1 flex-col gap-3 px-6 sm:px-8">
                  {plan.features.map((feature) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <li
                        key={feature.text}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                            isPopular
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          <FeatureIcon className="h-3 w-3" aria-hidden="true" />
                        </span>
                        <span className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {feature.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="p-6 pt-8 sm:p-8">
                  <Link
                    href={plan.ctaHref}
                    className={`w-full ${isPopular ? "btn-brand" : "btn-brand-outline"}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          El equivalente en bolívares es referencial según la tasa configurada en
          la plataforma. Los precios de tus productos en el catálogo se recalculan
          automáticamente cuando actualizas la tasa del día.
        </p>
      </div>
    </section>
  );
}
