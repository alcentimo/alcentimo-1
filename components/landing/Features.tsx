import {
  Globe,
  ImageIcon,
  Layers,
  Shield,
  Store,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Presencia digital propietaria",
    description:
      "Catálogo corporativo con URL dedicada, listo para distribución omnicanal sin depender de marketplaces.",
  },
  {
    icon: Layers,
    title: "Gestión integral de inventario",
    description:
      "Visibilidad ejecutiva sobre stock, categorías y alertas operativas para decisiones comerciales informadas.",
  },
  {
    icon: ImageIcon,
    title: "Entrega de contenido inteligente",
    description:
      "CDN optimizado que garantiza carga instantánea del catálogo en cualquier condición de red.",
  },
  {
    icon: Globe,
    title: "Arquitectura multi-moneda",
    description:
      "Motor de conversión en tiempo real: precios en USD con equivalentes en bolívares siempre sincronizados.",
  },
  {
    icon: Shield,
    title: "Aislamiento multi-tenant",
    description:
      "Segregación estricta de datos por organización, con confidencialidad operativa de nivel empresarial.",
  },
  {
    icon: Zap,
    title: "Sincronización en tiempo real",
    description:
      "Los cambios en el panel se propagan al catálogo público al instante, sin desfase entre operación y venta.",
  },
];

export function Features() {
  return (
    <section
      id="caracteristicas"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-20">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="section-label">Capacidades del sistema</p>
            <h2 className="section-title mt-3 max-w-sm">
              Módulos diseñados para escalar con confianza
            </h2>
            <p className="section-subtitle mt-4 max-w-sm">
              Una suite SaaS con la misma precisión visual y operativa que tu
              panel de control: limpia, corporativa y lista para producción.
            </p>
          </div>

          <ul className="lg:col-span-8">
            {features.map((feature) => (
              <li key={feature.title} className="landing-feature-row group">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-teal-700 transition-colors group-hover:bg-teal-50 dark:bg-zinc-900 dark:text-teal-400 dark:group-hover:bg-teal-950/50">
                  <feature.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
