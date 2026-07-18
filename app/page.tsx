import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Layers,
  Menu,
  RefreshCw,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { RecoveryUrlRedirect } from "@/components/auth/RecoveryUrlRedirect";

const valueBlocks = [
  {
    icon: RefreshCw,
    title: "Conversión Algorítmica",
    description:
      "Motor de precisión BCV que garantiza una sincronización financiera exacta, eliminando la volatilidad de tu catálogo.",
  },
  {
    icon: BarChart3,
    title: "Analítica Operativa",
    description:
      "Reportes predictivos de última generación para un control absoluto sobre el flujo de inventario y la rentabilidad.",
  },
  {
    icon: Layers,
    title: "Arquitectura de Grado Empresarial",
    description:
      "Infraestructura PWA optimizada para una experiencia de usuario fluida, rápida y profesional en cualquier plataforma.",
  },
] as const;

const plans = [
  {
    id: "free",
    name: "Gratis",
    tagline: "Ideal para iniciar",
    price: "$0",
    period: "",
    highlight: false,
    features: [
      "Hasta 15 productos",
      "Catálogo público",
      "Precios USD/Bs automáticos",
      "Gestión de stock",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Diseñado para escalar",
    price: "$8",
    period: "/mes",
    highlight: true,
    features: [
      "Hasta 250 productos",
      "Todo lo del plan Gratis",
      "Capacidad expandida",
      "Soporte prioritario",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "El estándar para marcas líderes",
    price: "$15",
    period: "/mes",
    highlight: false,
    features: [
      "Productos ilimitados",
      "Soporte dedicado",
      "Roles de equipo avanzados",
      "Control total",
    ],
  },
] as const;

export default function Home() {
  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <RecoveryUrlRedirect />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-[#FAFAF9]/90 backdrop-blur-md safe-area-inset dark:border-zinc-800/60 dark:bg-zinc-950/90">
        <div className="page-container flex h-14 items-center justify-between gap-4 lg:h-16">
          <BrandLogo href="/" />

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Navegación principal"
          >
            <a href="#producto" className="landing-nav-link">
              Producto
            </a>
            <a href="#precios" className="landing-nav-link">
              Precios
            </a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/dashboard/login" className="landing-nav-link">
              Iniciar sesión
            </Link>
            <Link
              href="/dashboard/productos/nuevo"
              className="btn-brand gap-2 px-4 shadow-lg shadow-emerald-500/10"
            >
              Comenzar gratis
            </Link>
          </div>

          <details className="relative md:hidden">
            <summary className="touch-target list-none cursor-pointer rounded-xl text-zinc-700 [&::-webkit-details-marker]:hidden dark:text-zinc-300">
              <Menu className="h-5 w-5" aria-hidden />
              <span className="sr-only">Abrir menú</span>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-200/70 bg-white p-2 shadow-lg shadow-emerald-500/10 dark:border-zinc-800/70 dark:bg-zinc-950">
              <nav className="flex flex-col gap-0.5" aria-label="Menú móvil">
                <a
                  href="#producto"
                  className="landing-nav-link justify-start rounded-lg px-3 py-3"
                >
                  Producto
                </a>
                <a
                  href="#precios"
                  className="landing-nav-link justify-start rounded-lg px-3 py-3"
                >
                  Precios
                </a>
                <hr className="my-1 border-zinc-200/70 dark:border-zinc-800/70" />
                <Link
                  href="/dashboard/login"
                  className="landing-nav-link justify-start rounded-lg px-3 py-3"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/dashboard/productos/nuevo"
                  className="btn-brand mt-1 gap-2 shadow-lg shadow-emerald-500/10"
                >
                  Comenzar gratis
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </header>

      <main className="landing-shell">
        {/* Hero */}
        <section className="section-padding pt-28 sm:pt-32 lg:pt-36">
          <div className="page-container">
            <div className="mx-auto max-w-4xl text-center">
              <p className="section-label">Infraestructura comercial</p>
              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08] dark:text-zinc-50">
                Alcentimo: La infraestructura de élite para el comercio
                inteligente
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                Plataforma premium diseñada para marcas que exigen precisión
                financiera, velocidad operativa y una presencia digital impecable
                en cualquier dispositivo.
              </p>
              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard/productos/nuevo"
                  className="btn-brand gap-2 px-6 shadow-lg shadow-emerald-500/10"
                >
                  Comenzar gratis
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#precios"
                  className="btn-brand-outline gap-2 px-6"
                >
                  Ver planes
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Arquitectura Técnica */}
        <section
          id="producto"
          className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
        >
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="section-label">Arquitectura técnica</p>
              <h2 className="section-title">
                Precisión, inteligencia y robustez en cada capa
              </h2>
            </div>

            <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
              {valueBlocks.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="group rounded-xl border border-zinc-200/70 bg-white p-6 shadow-lg shadow-emerald-500/10 transition-shadow hover:shadow-emerald-500/15 sm:p-7 dark:border-zinc-800/70 dark:bg-zinc-950"
                >
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Planes */}
        <section
          id="precios"
          className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
        >
          <div className="page-container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="section-label">Planes</p>
              <h2 className="section-title">Estructura premium, escalable</h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Elige el nivel de infraestructura que tu operación requiere hoy,
                con margen para crecer sin fricción.
              </p>
            </div>

            <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  className={`flex flex-col rounded-xl border p-6 shadow-lg sm:p-7 ${
                    plan.highlight
                      ? "border-emerald-300/80 bg-white shadow-emerald-500/15 ring-1 ring-emerald-500/20 dark:border-emerald-700/60 dark:bg-zinc-950 dark:ring-emerald-500/30"
                      : "border-zinc-200/70 bg-white shadow-emerald-500/10 dark:border-zinc-800/70 dark:bg-zinc-950"
                  }`}
                >
                  {plan.highlight && (
                    <span className="mb-4 inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      Recomendado
                    </span>
                  )}
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
                    {plan.period && (
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {plan.period}
                      </span>
                    )}
                  </p>
                  <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-zinc-200/70 pt-6 dark:border-zinc-800/70">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                          aria-hidden
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/productos/nuevo"
                    className={`mt-8 gap-2 ${
                      plan.highlight ? "btn-brand" : "btn-brand-outline"
                    } shadow-lg shadow-emerald-500/10`}
                  >
                    {plan.id === "free" ? "Comenzar gratis" : "Elegir plan"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Integraciones */}
        <section className="section-padding border-t border-zinc-200/60 pb-20 sm:pb-24 dark:border-zinc-800/60">
          <div className="page-container">
            <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
              Integración nativa con los ecosistemas de pago y logística de
              mayor relevancia en Venezuela.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200/60 bg-white safe-area-bottom dark:border-zinc-800/60 dark:bg-zinc-950">
        <div className="page-container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <BrandLogo href="/" size="sm" />
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} alcentimo. Todos los derechos
            reservados.
          </p>
          <Link
            href="/privacy"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Privacidad
          </Link>
        </div>
      </footer>
    </>
  );
}
