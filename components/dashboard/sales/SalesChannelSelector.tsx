"use client";

import { MoreHorizontal, Store } from "lucide-react";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import {
  SALES_CHANNELS,
  type SalesChannelKey,
} from "@/src/config/sales-channels";

interface SalesChannelSelectorProps {
  value: SalesChannelKey;
  onChange: (key: SalesChannelKey) => void;
}

function ChannelIcon({
  logoProvider,
}: {
  logoProvider?: (typeof SALES_CHANNELS)[number]["logoProvider"];
}) {
  if (logoProvider) {
    return <ChannelLogo provider={logoProvider} className="h-9 w-9" />;
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <Store className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

export function SalesChannelSelector({
  value,
  onChange,
}: SalesChannelSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="label-field">Canal de venta</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SALES_CHANNELS.map((channel) => {
          const selected = value === channel.key;
          const isOtro = channel.key === "otro";

          return (
            <label
              key={channel.key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                selected
                  ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-100 dark:border-teal-500 dark:bg-teal-950/20 dark:ring-teal-950/60"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="canal_venta_key"
                value={channel.key}
                checked={selected}
                onChange={() => onChange(channel.key)}
                className="sr-only"
              />
              {isOtro ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </div>
              ) : (
                <ChannelIcon logoProvider={channel.logoProvider} />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {channel.label}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {channel.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function getSalesChannelDbValue(key: SalesChannelKey): string {
  return SALES_CHANNELS.find((channel) => channel.key === key)?.dbValue ?? "Otro";
}
