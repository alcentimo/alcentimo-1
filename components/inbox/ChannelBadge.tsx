import {
  SiFacebook,
  SiInstagram,
  SiMercadopago,
  SiWhatsapp,
} from "react-icons/si";
import type { InboxProvider } from "@/lib/inbox/types";

const CHANNEL_META: Record<
  InboxProvider,
  { label: string; shortLabel: string; backgroundClassName: string; title: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    shortLabel: "WA",
    backgroundClassName: "bg-[#25D366]",
    title: "WhatsApp",
  },
  messenger: {
    label: "Facebook Messenger",
    shortLabel: "Messenger",
    backgroundClassName: "bg-[#1877F2]",
    title: "Facebook Messenger",
  },
  instagram: {
    label: "Instagram",
    shortLabel: "IG",
    backgroundClassName:
      "bg-linear-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    title: "Instagram",
  },
  mercadolibre: {
    label: "MercadoLibre",
    shortLabel: "ML",
    backgroundClassName: "bg-[#FFE600]",
    title: "MercadoLibre",
  },
};

interface ChannelBadgeProps {
  provider: InboxProvider;
  compact?: boolean;
  micro?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function getChannelShortLabel(provider: InboxProvider): string {
  return CHANNEL_META[provider].shortLabel;
}

/** Indicador compacto de canal para listas de alto volumen. */
export function ChannelBadge({
  provider,
  compact = true,
  micro = false,
  showLabel = false,
  className = "",
}: ChannelBadgeProps) {
  const meta = CHANNEL_META[provider];
  const sizeClass = micro ? "h-4 w-4" : compact ? "h-5 w-5" : "h-6 w-6";
  const iconClass = micro ? "h-2.5 w-2.5" : compact ? "h-3 w-3" : "h-3.5 w-3.5";

  function renderIcon() {
    switch (provider) {
      case "whatsapp":
        return <SiWhatsapp className={`${iconClass} text-white`} />;
      case "instagram":
        return <SiInstagram className={`${iconClass} text-white`} />;
      case "messenger":
        return <SiFacebook className={`${iconClass} text-white`} />;
      case "mercadolibre":
        return <SiMercadopago className={`${iconClass} text-[#2D3277]`} />;
    }
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 ${className}`}
      title={meta.title}
    >
      <span
        className={`inline-flex items-center justify-center rounded-md shadow-sm ${sizeClass} ${meta.backgroundClassName}`}
        aria-label={meta.title}
      >
        {renderIcon()}
      </span>
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {meta.shortLabel}
        </span>
      )}
    </span>
  );
}
