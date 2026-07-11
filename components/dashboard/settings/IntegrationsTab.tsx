"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, Link2, Sparkles } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ChannelIntegration } from "@/lib/inbox/types";
import { getIntegrationForProvider } from "@/lib/inbox/get-store-integrations";
import {
  CHANNEL_INTEGRATIONS,
  type ChannelCategory,
  type ChannelIntegrationDefinition,
  type ChannelProviderKey,
} from "@/src/config/channel-integrations";

interface IntegrationsTabProps {
  integrations: ChannelIntegration[];
  focusChannel?: ChannelProviderKey | null;
  statusMessage?: string | null;
  statusTone?: "success" | "error" | null;
}

const CATEGORY_LABELS: Record<ChannelCategory, { title: string; description?: string }> =
  {
    messaging: {
      title: "Mensajería",
      description: "WhatsApp, Instagram y Facebook Messenger vía Meta Business.",
    },
    marketplace: {
      title: "Marketplace",
      description: "Conecta tu cuenta de vendedor en MercadoLibre.",
    },
  };

function MessagingIntegrationCard({
  channel,
  connected,
  highlighted,
  cardRef,
}: {
  channel: ChannelIntegrationDefinition;
  connected: boolean;
  highlighted: boolean;
  cardRef: (node: HTMLElement | null) => void;
}) {
  const connectLabel =
    channel.connectLabel ?? (connected ? `Reautorizar ${channel.label}` : `Conectar ${channel.label}`);

  return (
    <article
      ref={cardRef}
      className={`overflow-hidden rounded-2xl border bg-linear-to-r p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${channel.accentClass} ${
        highlighted
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
            href={channel.connectPath}
            className={`btn-brand inline-flex items-center justify-center gap-2 shadow-sm ${
              connected ? "btn-brand-outline bg-white/80 dark:bg-zinc-950/80" : ""
            }`}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {connectLabel}
          </a>
          <Link
            href={channel.destinationHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Ir a Mensajes
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function MercadoLibreIntegrationCard({
  channel,
  connected,
  highlighted,
  cardRef,
}: {
  channel: ChannelIntegrationDefinition;
  connected: boolean;
  highlighted: boolean;
  cardRef: (node: HTMLElement | null) => void;
}) {
  const connectLabel = channel.connectLabel ?? "Conectar cuenta";

  return (
    <article
      ref={cardRef}
      className={`settings-option-card ${
        highlighted
          ? "border-teal-500 ring-2 ring-teal-100 dark:border-teal-500 dark:ring-teal-950/60"
          : ""
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <ChannelLogo provider="mercadolibre" className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {channel.label}
              </p>
              {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Pendiente
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {channel.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a
            href={channel.connectPath}
            className={`btn-brand inline-flex min-w-[10.5rem] items-center justify-center gap-2 shadow-sm ${
              connected ? "btn-brand-outline" : ""
            }`}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {connected ? "Reautorizar cuenta" : connectLabel}
          </a>
          {connected && (
            <Link
              href={channel.destinationHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Ir a Mensajes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
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

  const categories: ChannelCategory[] = ["messaging", "marketplace"];

  return (
    <div className="settings-tab-content">
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

      {categories.map((category) => {
        const channels = CHANNEL_INTEGRATIONS.filter(
          (item) => item.category === category,
        );

        if (channels.length === 0) return null;

        const { title, description } = CATEGORY_LABELS[category];

        return (
          <section key={category} className="settings-section">
            <header className="settings-section-header">
              <h2 className="settings-section-title">{title}</h2>
              {description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </header>

            <div className="settings-section-grid">
              {channels.map((channel) => {
                const connected = Boolean(
                  getIntegrationForProvider(integrations, channel.key),
                );
                const highlighted = focusChannel === channel.key;
                const setRef = (node: HTMLElement | null) => {
                  cardRefs.current[channel.key] = node;
                };

                if (channel.key === "mercadolibre") {
                  return (
                    <MercadoLibreIntegrationCard
                      key={channel.key}
                      channel={channel}
                      connected={connected}
                      highlighted={highlighted}
                      cardRef={setRef}
                    />
                  );
                }

                return (
                  <MessagingIntegrationCard
                    key={channel.key}
                    channel={channel}
                    connected={connected}
                    highlighted={highlighted}
                    cardRef={setRef}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
