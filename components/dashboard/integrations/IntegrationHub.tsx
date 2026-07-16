"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Settings2, Unplug } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ChannelIntegration } from "@/lib/inbox/types";
import { getIntegrationForProvider } from "@/lib/inbox/get-store-integrations";
import { disconnectChannelIntegration } from "@/lib/integrations/actions";
import {
  CHANNEL_INTEGRATIONS,
  type ChannelIntegrationDefinition,
  type ChannelProviderKey,
} from "@/src/config/channel-integrations";

export interface IntegrationHubProps {
  integrations: ChannelIntegration[];
  focusChannel?: ChannelProviderKey | null;
  statusMessage?: string | null;
  statusTone?: "success" | "error" | null;
}

type ConnectionStatus = "connected" | "disconnected";

function resolveConnectionStatus(connected: boolean): ConnectionStatus {
  return connected ? "connected" : "disconnected";
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const isConnected = status === "connected";

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold ${
        isConnected
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          isConnected
            ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
            : "bg-zinc-300 shadow-[0_0_0_3px_rgba(161,161,170,0.2)] dark:bg-zinc-600"
        }`}
        aria-hidden="true"
      />
      {isConnected ? "Conectado" : "Desconectado"}
    </span>
  );
}

function IntegrationHubCard({
  channel,
  integration,
  highlighted,
  cardRef,
  onDisconnect,
  disconnecting,
}: {
  channel: ChannelIntegrationDefinition;
  integration?: ChannelIntegration;
  highlighted: boolean;
  cardRef: (node: HTMLElement | null) => void;
  onDisconnect: (provider: ChannelProviderKey) => void;
  disconnecting: boolean;
}) {
  const connected = Boolean(integration?.is_active);
  const status = resolveConnectionStatus(connected);
  const accountLabel = integration?.display_name?.trim();

  return (
    <article
      ref={cardRef}
      className={`integration-hub-card ${
        highlighted
          ? "border-teal-500 ring-2 ring-teal-100 dark:border-teal-500 dark:ring-teal-950/60"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <ChannelLogo provider={channel.key} className="h-14 w-14 shadow-sm" />
        <StatusBadge status={status} />
      </div>

      <div className="mt-5 min-w-0">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {channel.label}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {channel.description}
        </p>
        {connected && accountLabel && (
          <p className="mt-3 truncate text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Cuenta: {accountLabel}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {connected ? (
          <>
            <a
              href={channel.connectPath}
              className="btn-brand-outline inline-flex w-full items-center justify-center gap-2"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              Configurar
            </a>
            <button
              type="button"
              onClick={() => onDisconnect(channel.key)}
              disabled={disconnecting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Unplug className="h-4 w-4" aria-hidden="true" />
              {disconnecting ? "Desconectando…" : "Desconectar"}
            </button>
          </>
        ) : (
          <a
            href={channel.connectPath}
            className="btn-brand-outline inline-flex w-full items-center justify-center gap-2"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {channel.connectLabel ?? `Conectar ${channel.label}`}
          </a>
        )}
      </div>
    </article>
  );
}

export function IntegrationHub({
  integrations,
  focusChannel = null,
  statusMessage = null,
  statusTone = null,
}: IntegrationHubProps) {
  const router = useRouter();
  const [pendingProvider, setPendingProvider] =
    useState<ChannelProviderKey | null>(null);
  const [, startTransition] = useTransition();
  const cardRefs = useRef<Partial<Record<ChannelProviderKey, HTMLElement | null>>>(
    {},
  );

  useEffect(() => {
    if (!focusChannel) return;
    const node = cardRefs.current[focusChannel];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusChannel]);

  function handleDisconnect(provider: ChannelProviderKey) {
    setPendingProvider(provider);
    startTransition(async () => {
      const result = await disconnectChannelIntegration(provider);
      setPendingProvider(null);

      if (result.error) {
        console.error("[IntegrationHub] disconnect error:", result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Canales de venta
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Conecta tus canales para centralizar toda tu operación en Alcentimo.
        </p>
      </header>

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

      <div className="integration-hub-grid">
        {CHANNEL_INTEGRATIONS.map((channel) => {
          const integration = getIntegrationForProvider(integrations, channel.key);
          const highlighted = focusChannel === channel.key;

          return (
            <IntegrationHubCard
              key={channel.key}
              channel={channel}
              integration={integration}
              highlighted={highlighted}
              cardRef={(node) => {
                cardRefs.current[channel.key] = node;
              }}
              onDisconnect={handleDisconnect}
              disconnecting={pendingProvider === channel.key}
            />
          );
        })}
      </div>
    </div>
  );
}
