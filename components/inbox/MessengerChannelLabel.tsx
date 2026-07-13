import { SiFacebook } from "react-icons/si";
import type { InboxProvider } from "@/lib/inbox/types";

interface MessengerChannelLabelProps {
  variant?: "compact" | "prominent";
  className?: string;
}

/** Etiqueta explícita de canal para conversaciones de Facebook Messenger. */
export function MessengerChannelLabel({
  variant = "compact",
  className = "",
}: MessengerChannelLabelProps) {
  if (variant === "prominent") {
    return (
      <span
        className={`inbox-messenger-label inbox-messenger-label--prominent ${className}`}
      >
        <SiFacebook className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Facebook Messenger
      </span>
    );
  }

  return (
    <span
      className={`inbox-messenger-label inbox-messenger-label--compact ${className}`}
    >
      <SiFacebook className="h-3 w-3 shrink-0" aria-hidden="true" />
      Facebook Messenger
    </span>
  );
}

export function isMessengerProvider(provider: InboxProvider): boolean {
  return provider === "messenger";
}
