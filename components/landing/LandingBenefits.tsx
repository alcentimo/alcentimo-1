import {
  MessageCircle,
  Smartphone,
  Store,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

const benefits = [
  {
    icon: Store,
    title: "Tu vitrina lista para compartir",
    description:
      "Obtén un enlace propio de tu tienda para WhatsApp, Instagram o donde ya vendes. Tus clientes ven fotos, precios y stock actualizado.",
  },
  {
    icon: MessageCircle,
    title: "Pedidos que llegan a tu WhatsApp",
    description:
      "Cuando alguien compra, recibes el pedido organizado con productos, totales y datos del cliente. Respondes y cierras la venta como siempre.",
  },
  {
    icon: Wallet,
    title: "Precios en dólares y bolívares sin calculadora",
    description:
      "Publica en USD y Alcentimo muestra el equivalente en Bs con la tasa del día. Tus clientes entienden cuánto pagan sin confusiones.",
  },
  {
    icon: Smartphone,
    title: "Gestiona todo desde el celular",
    description:
      "Actualiza productos, revisa pedidos y comparte tu catálogo desde cualquier dispositivo. Tu negocio no se detiene cuando sales de la tienda.",
  },
] as const;

export function LandingBenefits() {
  return (
    <section
      id="caracteristicas"
      className="section-padding border-t border-zinc-200/60 dark:border-zinc-800/60"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="success" className="mb-4">
            Por qué Alcentimo
          </Badge>
          <h2 className="section-title text-balance">
            Menos papeles, más ventas
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Herramientas prácticas para ferreterías, abastos, boutiques y
            cualquier negocio que quiera vender mejor en digital.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full border-zinc-200/80 shadow-md shadow-emerald-500/5 transition-shadow hover:shadow-lg hover:shadow-emerald-500/10 dark:border-zinc-800/80">
                <CardHeader className="pb-2 pt-5 sm:px-6">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {title}
                  </h3>
                </CardHeader>
                <CardContent className="pb-6 sm:px-6">
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
