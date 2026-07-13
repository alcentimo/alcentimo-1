"use client";

import type { InboxChannelFilter } from "@/lib/inbox/inbox-filters";
import { ChannelBadge } from "@/components/inbox/ChannelBadge";
import type { InboxProvider } from "@/lib/inbox/types";

const FOCUS_OPTIONS: {
  value: InboxChannelFilter;
  label: string;
  provider?: InboxProvider;
}[] = [
  { value: "all", label: "Todos los canales" },
  { value: "messenger", label: "Solo Facebook Messenger", provider: "messenger" },
  { value: "instagram", label: "Solo Instagram", provider: "instagram" },
  { value: "mercadolibre", label: "Solo Mercado Libre", provider: "mercadolibre" },
  { value: "whatsapp", label: "Solo WhatsApp", provider: "whatsapp" },
];

interface ChannelFocusSelectorProps {
  value: InboxChannelFilter;
  onChange: (value: InboxChannelFilter) => void;
}

export function ChannelFocusSelector({
  value,
  onChange,
}: ChannelFocusSelectorProps) {
  const isFocused = value !== "all";
  const activeOption = FOCUS_OPTIONS.find((option) => option.value === value);

  return (
    <div className="inbox-channel-focus">
      <label className="sr-only" htmlFor="inbox-channel-focus-select">
        Modo enfoque por canal
      </label>
      <select
        id="inbox-channel-focus-select"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as InboxChannelFilter)
        }
        className={`inbox-channel-focus-select ${
          isFocused ? "inbox-channel-focus-select--active" : ""
        }`}
      >
        {FOCUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {isFocused && activeOption?.provider && (
        <div className="inbox-channel-focus-badge">
          <ChannelBadge provider={activeOption.provider} showLabel />
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
            Modo enfoque
          </span>
        </div>
      )}
    </div>
  );
}
