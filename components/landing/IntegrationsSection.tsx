import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { PaymentMethodLogo } from "@/components/payments/PaymentMethodLogo";
import { ShippingCarrierLogo } from "@/components/shipping/ShippingCarrierLogo";
import { PAYMENT_METHODS } from "@/src/config/payment-methods";
import { NATIONAL_CARRIER_METHODS } from "@/src/config/shipping-methods";

export function IntegrationsSection() {
  return (
    <section
      id="integraciones"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="max-w-xl">
          <p className="section-label">Ecosistema de integración</p>
          <h2 className="section-title mt-3">
            Conectividad operativa sin fricción
          </h2>
          <p className="section-subtitle mt-4 max-w-lg">
            Habilita pagos y logística desde un panel centralizado, con la misma
            lógica de configuración que usas en el dashboard.
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/dashboard/login"
            className="landing-glass group flex flex-col gap-4 p-5 transition-colors hover:border-teal-600/20 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-start gap-4">
              <ChannelLogo provider="whatsapp" className="h-11 w-11 shrink-0" />
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                  WhatsApp
                </p>
                <p className="mt-1 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Distribución comercial con un solo clic
                </p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Comparte tu catálogo con pedidos estructurados: productos,
                  envío y pago definidos desde el panel.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-teal-700 transition group-hover:gap-2 dark:text-teal-400 sm:self-center">
              Comenzar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Métodos de pago
            </h3>
            <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
              {PAYMENT_METHODS.map((method) => (
                <li key={method.key}>
                  <div className="flex items-center gap-3 py-3.5">
                    <PaymentMethodLogo
                      methodKey={method.key}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {method.label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Envíos nacionales
            </h3>
            <ul className="mt-4 divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
              {NATIONAL_CARRIER_METHODS.map((method) => (
                <li key={method.key}>
                  <div className="flex items-center gap-3 py-3.5">
                    <ShippingCarrierLogo
                      carrierKey={method.key}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {method.label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              También puedes ofrecer delivery local y retiro en tienda desde el
              panel de ajustes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
