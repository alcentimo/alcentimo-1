import type { ChannelProviderKey } from "@/src/config/channel-integrations";

interface ChannelLogoProps {
  provider: ChannelProviderKey | "facebook";
  className?: string;
}

/** Logos estilizados de Meta / WhatsApp — sin assets externos. */
export function ChannelLogo({
  provider,
  className = "h-11 w-11",
}: ChannelLogoProps) {
  switch (provider) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
          <rect width="44" height="44" rx="12" fill="#25D366" />
          <path
            fill="#FFFFFF"
            d="M22.2 10c-6.8 0-12.3 5.5-12.3 12.3 0 2.2.6 4.3 1.7 6.1L10 34l5.9-1.5c1.7.9 3.6 1.4 5.6 1.4 6.8 0 12.3-5.5 12.3-12.3S29 10 22.2 10zm0 22.4c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.5.9.9-3.4-.2-.4a9.8 9.8 0 0 1-1.5-5.3c0-5.4 4.4-9.8 9.8-9.8s9.8 4.4 9.8 9.8-4.4 9.8-9.8 9.8zm5.4-7.3c-.3-.1-1.7-.8-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.1-.3 0-.4 0-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 3.9 3.4 2.3.9 2.3.6 2.7.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.5-.2z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect width="44" height="44" rx="12" fill="url(#igGrad)" />
          <rect
            x="13"
            y="13"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <circle cx="22" cy="22" r="4.5" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="29" cy="15" r="1.5" fill="#FFFFFF" />
        </svg>
      );
    case "messenger":
    case "facebook":
      return (
        <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
          <rect width="44" height="44" rx="12" fill="#1877F2" />
          <path
            fill="#FFFFFF"
            d="M23.2 34.5 14 37l2.6-8.8C14.8 25.8 14 23 14 20c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10c-2.2 0-4.2-.7-5.8-1.9L23.2 34.5z"
          />
        </svg>
      );
  }
}
