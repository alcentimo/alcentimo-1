import { Package, ShoppingBag, Users } from "lucide-react";

const steps = [
  {
    step: 1,
    icon: Package,
    title: "Elige productos listos",
    description:
      "Explora el catálogo y agrégalos a tu tienda. Sin comprar stock ni gestionar logística.",
  },
  {
    step: 2,
    icon: ShoppingBag,
    title: "Activa tu tienda",
    description:
      "Pon tu nombre, tu logo y comparte el enlace. Tu negocio digital queda listo para vender.",
  },
  {
    step: 3,
    icon: Users,
    title: "Vende por WhatsApp",
    description:
      "Recibe pedidos organizados y atiende donde ya conversas con tus clientes.",
  },
] as const;

export function LandingCustomerExperience() {
  return (
    <section
      id="experiencia"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">¿Cómo funciona</p>
          <h2 className="section-title text-balance">
            Tres pasos. Sin complicaciones.
          </h2>
          <p className="section-subtitle mx-auto">
            Pensado para empezar hoy, aunque nunca hayas vendido online.
          </p>
        </div>

        <ol className="relative mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-12 md:mt-20 md:grid-cols-3 md:gap-10 lg:gap-14">
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-5 hidden h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent md:block dark:via-zinc-700"
            aria-hidden="true"
          />

          {steps.map(({ step, icon: Icon, title, description }) => (
            <li
              key={step}
              className="landing-step relative flex flex-col items-center text-center"
            >
              <span className="landing-step-number" aria-hidden="true">
                {step}
              </span>
              <div className="landing-step-icon">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
