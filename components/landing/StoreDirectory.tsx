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
    <section
      id="tiendas"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="max-w-xl">
          <p className="section-label">Comunidad</p>
          <h2 className="section-title mt-3">Tiendas activas</h2>
          <p className="section-subtitle mt-3">
            Negocios que ya operan con la infraestructura de alcentimo.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-200/60 bg-zinc-200/60 sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800/60 dark:bg-zinc-800/60">
          {stores.map((store) => (
            <li key={store.slug} className="bg-white dark:bg-zinc-950">
              <Link
                href={`/tienda/${store.slug}`}
                className="group flex h-full min-h-[5.5rem] flex-col justify-between p-5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div>
                  <p className="text-base font-semibold tracking-tight text-zinc-900 group-hover:text-teal-700 dark:text-zinc-50 dark:group-hover:text-teal-400">
                    {store.name}
                  </p>
                  {store.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {store.description}
                    </p>
                  )}
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-400">
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
