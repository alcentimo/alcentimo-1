import { MessageCircle, PackageOpen, Sparkles } from "lucide-react";

const benefits = [
  {
    icon: PackageOpen,
    title: "Sin inventario ni logística",
    description:
      "Catálogo de productos listos para vender. Tú consigues clientes; el stock y el envío no son tu problema.",
  },
  {
    icon: MessageCircle,
    title: "Vende por WhatsApp",
    description:
      "Comparte tu tienda y atiende pedidos desde el chat que ya usas todos los días.",
  },
  {
    icon: Sparkles,
    title: "IA para vender más",
    description:
      "Te ayuda a presentar productos y responder dudas, aunque no seas experto en ventas online.",
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
          <p className="section-label">Beneficios</p>
          <h2 className="section-title text-balance">
            Menos fricción. Más ventas.
          </h2>
          <p className="section-subtitle mx-auto">
            Dropshipping claro, sin tecnicismos ni procesos eternos.
          </p>
        </div>

        <ul className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-12 md:mt-20 md:grid-cols-3 md:gap-10 lg:gap-14">
          {benefits.map(({ icon: Icon, title, description }) => (
            <li key={title} className="landing-benefit text-center md:text-left">
              <div className="landing-benefit-icon mx-auto md:mx-0">
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
      </div>
    </section>
  );
}
