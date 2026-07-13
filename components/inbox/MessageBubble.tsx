"use client";

import { formatMessageTime } from "@/lib/inbox/get-store-messages";
import type { ChannelMessage } from "@/lib/inbox/types";
import {
  formatOutboundMessageStatus,
  getOutboundStatusTone,
} from "@/lib/inbox/message-status";
import { MessageActionMenu } from "@/components/inbox/MessageActionMenu";
import { cn } from "@/lib/cn";

interface MessageBubbleProps {
  message: ChannelMessage;
  conversationId: string;
  onConversationAction?: (patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) => void;
}

export function MessageBubble({
  message,
  conversationId,
  onConversationAction,
}: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isPending = message.id.startsWith("pending-");
  const isNew = !isOutbound && message.status === "unread";
  const deliveryLabel = isPending
    ? "Enviando…"
    : isOutbound
      ? formatOutboundMessageStatus(message.deliveryStatus ?? "sent")
      : null;

  return (
    <div
      className={cn(
        "group flex w-full",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <article
        className={cn(
          "inbox-pro-bubble relative max-w-[min(85%,36rem)]",
          isOutbound
            ? "inbox-pro-bubble--outbound"
            : "inbox-pro-bubble--inbound",
          isPending && "inbox-pro-bubble--pending",
        )}
      >
        {!isOutbound && (
          <div className="absolute -right-1 -top-1 opacity-0 transition-opacity group-hover:opacity-100">
            <MessageActionMenu
              conversationId={conversationId}
              onActionComplete={onConversationAction}
            />
          </div>
        )}

        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
          {message.message_text?.trim() || "Mensaje sin texto"}
        </p>

        <div
          className={cn(
            "mt-2 flex items-center gap-2 text-[11px]",
            isOutbound
              ? "text-zinc-300"
              : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          <span>{formatMessageTime(message.created_at)}</span>
          {deliveryLabel && (
            <span
              className={getOutboundStatusTone(message.deliveryStatus ?? "sent")}
            >
              {deliveryLabel}
            </span>
          )}
          {isNew && (
            <span className="inbox-pro-bubble-new">Nuevo</span>
          )}
        </div>
      </article>
    </div>
  );
}
