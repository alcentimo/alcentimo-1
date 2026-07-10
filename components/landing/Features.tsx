import {
  Globe,
  ImageIcon,
  Package,
  Shield,
  Store,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Tu tienda, tu enlace",
    description:
      "Cada negocio obtiene un catálogo público con URL propia para compartir por WhatsApp o redes.",
  },
  {
    icon: Package,
    title: "Control de inventario",
    description:
      "Registra stock, recibe alertas de productos agotados y mantén tu vitrina siempre actualizada.",
  },
  {
    icon: ImageIcon,
    title: "Imágenes optimizadas",
    description:
      "Las fotos se comprimen automáticamente para cargar rápido incluso con señal débil.",
  },
  {
    icon: Globe,
    title: "Catálogo multi-moneda",
    description:
      "Precio referencial en USD y equivalente en bolívares visible en cada producto.",
  },
  {
    icon: Shield,
    title: "Datos aislados por tienda",
    description:
      "Arquitectura multi-tenant: tu información queda separada y protegida de otros negocios.",
  },
  {
    icon: Zap,
    title: "Publicación instantánea",
    description:
      "Agrega un producto en el panel y aparece de inmediato en tu catálogo público.",
  },
];

export function Features() {
  return (
    <section id="caracteristicas" className="section-padding bg-zinc-100/60 dark:bg-zinc-900/40">
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Herramientas de trabajo</p>
          <h2 className="section-title">
            Todo lo que necesitas para vender en serio
          </h2>
          <p className="section-subtitle mx-auto">
            Diseñado para comerciantes venezolanos que necesitan claridad en
            precios, control de stock y una presencia digital profesional.
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
