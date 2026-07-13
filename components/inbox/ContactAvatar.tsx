"use client";

import { useState } from "react";
import { ChannelBadge } from "@/components/inbox/ChannelBadge";
import type { InboxProvider } from "@/lib/inbox/types";

interface ContactAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  senderId: string;
  provider: InboxProvider;
  size?: "sm" | "md";
  showChannelBadge?: boolean;
  className?: string;
}

function getContactInitials(
  displayName: string | null | undefined,
  senderId: string,
): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  }

  const digits = senderId.replace(/\D/g, "");
  if (digits.length >= 2) {
    return digits.slice(-2);
  }

  return senderId.slice(0, 2).toUpperCase() || "?";
}

export function ContactAvatar({
  avatarUrl,
  displayName,
  senderId,
  provider,
  size = "sm",
  showChannelBadge = false,
  className = "",
}: ContactAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedAvatarUrl = avatarUrl?.trim() ?? "";
  const showImage = Boolean(normalizedAvatarUrl) && !imageFailed;
  const initials = getContactInitials(displayName, senderId);
  const sizeClass =
    size === "md" ? "inbox-contact-avatar--md" : "inbox-contact-avatar--sm";

  return (
    <span
      className={`inbox-contact-avatar ${sizeClass} ${className}`.trim()}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={normalizedAvatarUrl}
          alt=""
          className="inbox-contact-avatar-image"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="inbox-contact-avatar-fallback">{initials}</span>
      )}

      {showChannelBadge && (
        <span className="inbox-contact-avatar-channel">
          <ChannelBadge provider={provider} micro />
        </span>
      )}
    </span>
  );
}
