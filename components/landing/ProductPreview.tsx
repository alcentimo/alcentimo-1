import {
  BarChart3,
  ClipboardList,
  Package,
  RefreshCw,
  Settings2,
  Store,
  TrendingUp,
} from "lucide-react";
import { formatExchangeRate, formatUsd, formatVes } from "@/lib/format";

interface ProductPreviewProps {
  exchangeRate: number | null;
}

const mockProducts = [
  { name: "Arroz Premium 1kg", usd: 2.5, stock: 48 },
  { name: "Aceite Vegetal 900ml", usd: 4.2, stock: 12 },
];

const navIcons = [Store, ClipboardList, BarChart3, Settings2];

export function ProductPreview({ exchangeRate }: ProductPreviewProps) {
  const sampleVes =
    exchangeRate != null ? mockProducts[0].usd * exchangeRate : null;

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none" aria-hidden="true">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/5"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-4 h-40 w-40 rounded-full bg-zinc-300/20 blur-3xl dark:bg-zinc-600/10"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-6 gap-3 sm:gap-3.5">
        {/* Main dashboard panel */}
        <div className="landing-glass col-span-6 overflow-hidden lg:col-span-4 lg:row-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-200/60 px-3.5 py-2.5 dark:border-zinc-700/60">
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-teal-500/80" />
            <span className="ml-1 truncate text-[11px] font-medium text-zinc-400">
              app.alcentimo.com/dashboard
            </span>
          </div>

          <div className="flex min-h-[220px] sm:min-h-[240px]">
            <div className="hidden w-12 shrink-0 flex-col gap-2 border-r border-zinc-200/60 bg-zinc-50/80 p-2 sm:flex dark:border-zinc-700/60 dark:bg-zinc-900/50">
              {navIcons.map((Icon, index) => (
                <span
                  key={index}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    index === 0
                      ? "border-l-2 border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-400"
                      : "text-zinc-400"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              ))}
            </div>

            <div className="min-w-0 flex-1 p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    Catálogo
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Inventario activo
                  </p>
                </div>
                <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  128 SKU
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {mockProducts.map((product) => {
                  const ves =
                    exchangeRate != null ? product.usd * exchangeRate : null;

                  return (
                    <li
                      key={product.name}
                      className="flex items-center gap-2.5 rounded-lg border border-zinc-200/50 bg-white/60 px-2.5 py-2 dark:border-zinc-700/50 dark:bg-zinc-950/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800">
                        {product.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
                          {product.name}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatUsd(product.usd)}
                          </span>
                          {ves != null && (
                            <span className="text-[10px] font-medium text-teal-700 dark:text-teal-400">
                              {formatVes(ves)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        {product.stock} uds.
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* KPI — productos */}
        <div className="landing-glass col-span-3 flex flex-col justify-between p-3.5 sm:p-4 lg:col-span-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
            <Package className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Productos
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              128
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Sincronizados al catálogo
            </p>
          </div>
        </div>

        {/* KPI — tasa */}
        <div className="landing-glass col-span-3 flex flex-col justify-between p-3.5 sm:p-4 lg:col-span-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Tasa BCV
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {exchangeRate != null
                ? `Bs. ${formatExchangeRate(exchangeRate)}`
                : "—"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Actualización automática
            </p>
          </div>
        </div>

        {/* Catálogo público */}
        <div className="landing-glass col-span-6 p-3.5 sm:p-4 lg:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Canal digital
          </p>
          <p className="mt-1.5 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            alcentimo.com/c/mi-negocio
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Catálogo público con precios en USD y Bs. en tiempo real.
          </p>
          {sampleVes != null && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Ejemplo: {formatUsd(mockProducts[0].usd)}{" "}
              <span className="text-teal-700 dark:text-teal-400">
                → {formatVes(sampleVes)}
              </span>
            </p>
          )}
        </div>

        {/* Estado del sistema */}
        <div className="landing-glass col-span-6 flex items-center gap-3 p-3.5 sm:p-4 lg:col-span-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
              Infraestructura operativa
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              PWA · CDN · Multi-tenant · Alta disponibilidad
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
