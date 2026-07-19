import { Package, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const steps = [
  {
    step: 1,
    icon: Package,
    title: "Configuras tu inventario",
    description:
      "Sube productos, fotos y precios en USD. Alcentimo muestra el equivalente en bolívares automáticamente.",
  },
  {
    step: 2,
    icon: UserPlus,
    title: "Tu cliente se registra y crea su cuenta",
    description:
      "Comparte el enlace de tu tienda. Tus clientes navegan el catálogo, se registran y compran con sus datos guardados.",
  },
  {
    step: 3,
    icon: Users,
    title: "Gestionas pedidos y fidelizas clientes",
    description:
      "Recibe pedidos en WhatsApp, actualiza estados, conoce a tus compradores frecuentes y haz que vuelvan.",
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
          <Badge variant="success" className="mb-4">
            Experiencia del cliente
          </Badge>
          <h2 className="section-title text-balance">
            De tu inventario al pedido confirmado, en tres pasos
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Un flujo pensado para que tú vendas mejor y tus clientes compren
            con confianza.
          </p>
        </div>

        <ol className="relative mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          <div
            className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-10 hidden h-px bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent md:block dark:via-emerald-700/60"
            aria-hidden="true"
          />

          {steps.map(({ step, icon: Icon, title, description }, index) => (
            <li key={step} className="relative flex flex-col items-center text-center">
              <Card
                className={cn(
                  "w-full border-zinc-200/70 bg-[#FAFAF9] shadow-sm transition-shadow hover:shadow-md hover:shadow-emerald-500/5 dark:border-zinc-800/70 dark:bg-zinc-900/40",
                  index === 1 && "md:-mt-0",
                )}
              >
                <CardContent className="flex flex-col items-center px-6 py-8 sm:px-8 sm:py-10">
                  <span className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-500/25">
                    {step}
                  </span>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg dark:text-zinc-50">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
