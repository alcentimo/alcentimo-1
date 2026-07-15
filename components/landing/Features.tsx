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
      "Cada organización despliega un catálogo corporativo con dominio dedicado, listo para distribución omnicanal.",
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
      "Sistema de entrega de contenido (CDN) inteligente que garantiza carga instantánea en cualquier condición de red.",
  },
  {
    icon: Globe,
    title: "Arquitectura multi-moneda",
    description:
      "Motor de conversión en tiempo real que mantiene precios referenciales en USD y equivalentes en bolívares sincronizados.",
  },
  {
    icon: Shield,
    title: "Aislamiento de datos multi-tenant",
    description:
      "Arquitectura empresarial con segregación estricta de datos por organización, garantizando confidencialidad operativa.",
  },
  {
    icon: Zap,
    title: "Sincronización en tiempo real",
    description:
      "Los cambios en el panel se propagan de inmediato al catálogo público, eliminando desfases entre operación y venta.",
  },
];

export function Features() {
  return (
    <section id="caracteristicas" className="section-padding bg-zinc-100/60 dark:bg-zinc-900/40">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Capacidades de la plataforma</p>
          <h2 className="section-title">
            Todo lo que necesitas para escalar con confianza
          </h2>
          <p className="section-subtitle mx-auto">
            Una suite SaaS diseñada para organizaciones que exigen precisión
            financiera, control operativo y una presencia digital de nivel
            empresarial.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="card-surface p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
