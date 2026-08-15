import {
  MessageCircle,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  {
    icon: PackageOpen,
    title: "Sin inventario ni logística",
    description:
      "Accede a nuestro catálogo de productos listos para vender. Tú te enfocas en conseguir clientes; el stock y el envío no son tu problema.",
  },
  {
    icon: MessageCircle,
    title: "Vende por WhatsApp",
    description:
      "Comparte tu tienda y atiende pedidos desde el chat que ya usas todos los días. Cercano, directo y sin fricciones.",
  },
  {
    icon: Sparkles,
    title: "IA para vender más",
    description:
      "Te ayuda a presentar productos y responder dudas en tu catálogo, aunque no seas experto en ventas online.",
  },
] as const;

export function LandingBenefits() {
  return (
    <section
      id="caracteristicas"
      className="section-padding border-b border-zinc-200/60 bg-[#FAFAF9] dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4">
            Beneficios
          </Badge>
          <h2 className="section-title text-balance">
            Emprender no tiene que ser complicado
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Menos tecnicismos. Más claridad para empezar a vender.
          </p>
        </div>

        <ul className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full border-transparent bg-white shadow-none ring-1 ring-zinc-200/70 dark:bg-zinc-900/30 dark:ring-zinc-800/80">
                <CardContent className="px-6 py-8 sm:px-8 sm:py-10">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
