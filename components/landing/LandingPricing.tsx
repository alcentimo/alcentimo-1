import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

const plans = [
  {
    id: "free",
    name: "Gratis",
    tagline: "Para probar y arrancar",
    price: "$0",
    period: "",
    highlight: false,
    features: [
      "Hasta 15 productos",
      "Catálogo con enlace propio",
      "Precios USD y Bs automáticos",
      "Pedidos por WhatsApp",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para negocios en crecimiento",
    price: "$8",
    period: "/mes",
    highlight: true,
    features: [
      "Hasta 250 productos",
      "Todo lo del plan Gratis",
      "Más espacio para tu catálogo",
      "Soporte prioritario",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Para equipos y alto volumen",
    price: "$15",
    period: "/mes",
    highlight: false,
    features: [
      "Productos ilimitados",
      "Soporte dedicado",
      "Roles para tu equipo",
      "Control total del catálogo",
    ],
  },
] as const;

export function LandingPricing() {
  return (
    <section
      id="precios"
      className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4">
            Precios simples
          </Badge>
          <h2 className="section-title">Empieza gratis, crece cuando quieras</h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sin sorpresas ni contratos largos. Elige el plan que se ajuste al
            tamaño de tu negocio hoy.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
          {plans.map((plan) => (
            <li key={plan.id} className="flex">
              <Card
                className={`flex h-full w-full flex-col ${
                  plan.highlight
                    ? "border-emerald-300/80 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/20 dark:border-emerald-700/60 dark:ring-emerald-500/30"
                    : "border-zinc-200/80 shadow-md shadow-emerald-500/5 dark:border-zinc-800/80"
                }`}
              >
                <CardHeader className="pb-2 pt-6 sm:px-6">
                  {plan.highlight ? (
                    <Badge variant="success" className="mb-3 w-fit">
                      Más popular
                    </Badge>
                  ) : null}
                  <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {plan.tagline}
                  </p>
                  <p className="mt-5 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {plan.price}
                    </span>
                    {plan.period ? (
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {plan.period}
                      </span>
                    ) : null}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col pb-6 sm:px-6">
                  <ul className="flex flex-1 flex-col gap-3 border-t border-zinc-200/70 pt-5 dark:border-zinc-800/70">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/productos/nuevo"
                    className={`mt-8 inline-flex justify-center gap-2 ${
                      plan.highlight ? "btn-brand" : "btn-brand-outline"
                    } shadow-lg shadow-emerald-500/10`}
                  >
                    {plan.id === "free" ? "Comenzar gratis" : "Elegir plan"}
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
