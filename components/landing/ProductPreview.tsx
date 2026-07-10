import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";

interface ProductPreviewProps {
  exchangeRate: number | null;
}

const mockProducts = [
  { name: "Arroz Premium 1kg", usd: 2.5, stock: 48 },
  { name: "Aceite Vegetal 900ml", usd: 4.2, stock: 12 },
  { name: "Harina PAN 1kg", usd: 1.85, stock: 0 },
];

export function ProductPreview({ exchangeRate }: ProductPreviewProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute -inset-4 rounded-2xl bg-linear-to-br from-teal-500/10 via-transparent to-teal-600/5 blur-2xl dark:from-teal-400/10 dark:to-teal-500/5" />

      <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
          <span className="ml-2 truncate text-xs text-zinc-400">
            alcentimo.app/tienda/mi-negocio
          </span>
        </div>

        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Panel
              </p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Inventario activo
              </p>
            </div>
            {exchangeRate != null && (
              <span className="price-rate-badge shrink-0">
                Bs. {formatExchangeRate(exchangeRate)}/USD
              </span>
            )}
          </div>
        </div>

        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {mockProducts.map((product) => {
            const ves =
              exchangeRate != null ? product.usd * exchangeRate : null;

            return (
              <li
                key={product.name}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {product.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {product.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {formatUsd(product.usd)}
                    </span>
                    {ves != null && (
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
                        {formatVes(ves)}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    product.stock <= 0
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : product.stock <= 15
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                  }`}
                >
                  {product.stock <= 0 ? "Agotado" : `${product.stock} uds.`}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Vista previa del catálogo · datos de ejemplo
          </p>
        </div>
      </div>
    </div>
  );
}
