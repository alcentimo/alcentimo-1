import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";

interface MessagesEmptyStateProps {
  hasActiveIntegrations: boolean;
}

function integrationHref(): string {
  return "/dashboard/ajustes/integraciones?channel=whatsapp";
}

export function MessagesEmptyState({
  hasActiveIntegrations,
}: MessagesEmptyStateProps) {
  if (!hasActiveIntegrations) {
    return (
      <section className="overflow-hidden rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50 via-white to-emerald-50 shadow-sm dark:border-teal-900/40 dark:from-teal-950/30 dark:via-zinc-950 dark:to-emerald-950/20">
        <div className="border-b border-teal-100/80 px-6 py-8 dark:border-teal-900/40 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="section-label">Guía de inicio</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Conecta WhatsApp para empezar a recibir mensajes aquí
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Vincula tu cuenta de WhatsApp Business. Cuando un cliente te
                escriba, la conversación aparecerá en esta bandeja al instante.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ChannelLogo provider="whatsapp" className="h-12 w-12 shadow-sm" />
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                <MessageSquare className="h-6 w-6" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-3 sm:px-8">
          {[
            "Ve a Integraciones y elige WhatsApp.",
            "Autoriza el acceso con tu cuenta de negocio.",
            "Vuelve aquí para ver los mensajes entrantes.",
          ].map((step, index) => (
            <article
              key={step}
              className="rounded-xl border border-white/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {step}
              </p>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-teal-100/80 px-6 py-6 dark:border-teal-900/40 sm:flex-row sm:px-8">
          <Link
            href={integrationHref()}
            className="btn-brand inline-flex flex-1 items-center justify-center gap-2 shadow-sm"
          >
            <ChannelLogo provider="whatsapp" className="h-5 w-5 rounded-md" />
            Conectar WhatsApp
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="card-panel border-dashed text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Aún no hay conversaciones
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        WhatsApp ya está conectado. Cuando un cliente escriba, verás el hilo aquí
        automáticamente.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={integrationHref()}
          className="btn-brand inline-flex items-center justify-center gap-2 shadow-sm"
        >
          Conectar WhatsApp
        </Link>
        <Link
          href="/dashboard/ajustes/integraciones"
          className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400"
        >
          Ver integraciones
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
