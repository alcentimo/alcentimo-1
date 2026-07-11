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
      className="section-padding border-y border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="page-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Integraciones y métodos</p>
          <h2 className="section-title">
            Compatible con todo lo que necesitas
          </h2>
          <p className="section-subtitle mx-auto">
            Activa los métodos de pago y envío que ya usa tu cliente en
            Venezuela. Sin integraciones técnicas complicadas.
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/dashboard/login"
            className="group flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-linear-to-r from-emerald-50 to-teal-50 p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/30"
          >
            <div className="flex items-start gap-4">
              <ChannelLogo provider="whatsapp" className="h-12 w-12 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  WhatsApp
                </p>
                <p className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg dark:text-zinc-50">
                  Comparte tu catálogo por WhatsApp con un solo clic
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Tus clientes reciben el pedido listo para confirmar, con
                  productos, envío y pago seleccionados.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-emerald-700 transition group-hover:gap-2.5 dark:text-emerald-400 sm:self-center">
              Crear mi catálogo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Métodos de pago
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <li key={method.key}>
                  <div className="card-surface flex items-center gap-3 p-3 transition-shadow hover:shadow-md sm:p-3.5">
                    <PaymentMethodLogo
                      methodKey={method.key}
                      className="h-9 w-9 shrink-0"
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
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Envíos nacionales
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {NATIONAL_CARRIER_METHODS.map((method) => (
                <li key={method.key}>
                  <div className="card-surface flex items-center gap-3 p-3 transition-shadow hover:shadow-md sm:p-3.5">
                    <ShippingCarrierLogo
                      carrierKey={method.key}
                      className="h-9 w-9 shrink-0"
                    />
                    <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {method.label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              También puedes ofrecer delivery local y retiro en tienda desde
              el panel de ajustes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
