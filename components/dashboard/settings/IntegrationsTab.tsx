"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, Link2, Sparkles } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ChannelIntegration } from "@/lib/inbox/types";
import { getIntegrationForProvider } from "@/lib/inbox/get-store-integrations";
import {
  CHANNEL_INTEGRATIONS,
  type ChannelProviderKey,
} from "@/src/config/channel-integrations";

interface IntegrationsTabProps {
  integrations: ChannelIntegration[];
  focusChannel?: ChannelProviderKey | null;
  statusMessage?: string | null;
  statusTone?: "success" | "error" | null;
}

function buildConnectHref(provider: ChannelProviderKey): string {
  return `/api/integrations/meta/connect?provider=${provider}`;
}

export function IntegrationsTab({
  integrations,
  focusChannel = null,
  statusMessage = null,
  statusTone = null,
}: IntegrationsTabProps) {
  const cardRefs = useRef<Partial<Record<ChannelProviderKey, HTMLElement | null>>>(
    {},
  );

  useEffect(() => {
    if (!focusChannel) return;
    const node = cardRefs.current[focusChannel];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusChannel]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50 via-white to-emerald-50 p-6 shadow-sm dark:border-teal-900/40 dark:from-teal-950/30 dark:via-zinc-950 dark:to-emerald-950/20 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Guía de inicio
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Conecta tus canales para empezar a recibir mensajes aquí
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Autoriza WhatsApp, Instagram o Facebook con tu cuenta de Meta
              Business. Los mensajes entrantes llegarán automáticamente a tu
              bandeja de Mensajes.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <ChannelLogo provider="whatsapp" className="h-12 w-12 shadow-sm" />
            <ChannelLogo provider="instagram" className="h-12 w-12 shadow-sm" />
            <ChannelLogo provider="facebook" className="h-12 w-12 shadow-sm" />
          </div>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            "Elige el canal que quieres conectar.",
            "Autoriza el acceso con Meta Business.",
            "Recibe y responde mensajes desde Mensajes.",
          ].map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {statusMessage && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            statusTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {statusMessage}
        </p>
      )}

      <section className="grid grid-cols-1 gap-4">
        {CHANNEL_INTEGRATIONS.map((channel) => {
          const connected = Boolean(
            getIntegrationForProvider(integrations, channel.key),
          );

          return (
            <article
              key={channel.key}
              ref={(node) => {
                cardRefs.current[channel.key] = node;
              }}
              className={`overflow-hidden rounded-2xl border bg-linear-to-r p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${channel.accentClass} ${
                focusChannel === channel.key
                  ? "border-teal-500 ring-2 ring-teal-100 dark:border-teal-500 dark:ring-teal-950/60"
                  : "border-zinc-200/80 dark:border-zinc-800"
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <ChannelLogo provider={channel.key} className="h-14 w-14 shadow-sm" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {channel.label}
                      </p>
                      {connected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Conectado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          Pendiente
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {channel.headline}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {channel.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                  <a
                    href={buildConnectHref(channel.key)}
                    className={`btn-brand inline-flex items-center justify-center gap-2 shadow-sm ${
                      connected ? "btn-brand-outline bg-white/80 dark:bg-zinc-950/80" : ""
                    }`}
                  >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    {connected ? "Reautorizar" : "Conectar"} {channel.label}
                  </a>
                  <Link
                    href="/dashboard/mensajes"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Ir a Mensajes
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
