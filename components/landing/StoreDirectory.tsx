import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface StoreItem {
  name: string;
  slug: string;
  description: string | null;
}

interface StoreDirectoryProps {
  stores: StoreItem[];
}

export function StoreDirectory({ stores }: StoreDirectoryProps) {
  if (stores.length === 0) return null;

  return (
    <section id="tiendas" className="section-padding border-t border-zinc-200/80 dark:border-zinc-800">
      <div className="page-container">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">Comunidad</p>
            <h2 className="section-title mt-3">Tiendas activas</h2>
            <p className="section-subtitle mt-2">
              Negocios que ya venden con alcentimo.
            </p>
          </div>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <li key={store.slug}>
              <Link
                href={`/tienda/${store.slug}`}
                className="group card-surface flex min-h-[5.5rem] flex-col justify-between p-5 transition-all hover:border-teal-200 hover:shadow-md dark:hover:border-teal-900"
              >
                <div>
                  <p className="text-base font-semibold text-zinc-900 group-hover:text-teal-700 dark:text-zinc-50 dark:group-hover:text-teal-400">
                    {store.name}
                  </p>
                  {store.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {store.description}
                    </p>
                  )}
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400">
                  Ver catálogo
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
