"use client";

import { formatMessageTime } from "@/lib/inbox/get-store-messages";
import type { ChannelMessage } from "@/lib/inbox/types";
import {
  formatOutboundMessageStatus,
  getOutboundStatusTone,
} from "@/lib/inbox/message-status";
import { MessageActionMenu } from "@/components/inbox/MessageActionMenu";

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
  const isNew = !isOutbound && message.status === "unread";
  const deliveryLabel = isOutbound
    ? formatOutboundMessageStatus(message.deliveryStatus ?? "sent")
    : null;

  return (
    <div className={`group flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <article
        className={`relative max-w-[85%] sm:max-w-[72%] ${
          isOutbound ? "inbox-bubble-outbound" : "inbox-bubble-inbound"
        }`}
      >
        {!isOutbound && (
          <div className="absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <MessageActionMenu
              conversationId={conversationId}
              onActionComplete={onConversationAction}
            />
          </div>
        )}

        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.message_text?.trim() || "Mensaje sin texto"}
        </p>

        <div
          className={`mt-2 flex items-center gap-2 text-[11px] ${
            isOutbound ? "text-blue-100/90" : "text-slate-400 dark:text-slate-500"
          }`}
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
            <span className="inbox-bubble-new-badge">Nuevo</span>
          )}
        </div>
      </article>
    </div>
  );
}
