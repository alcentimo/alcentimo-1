"use client";

import { formatMessageTime } from "@/lib/inbox/get-store-messages";
import type { ChannelMessage } from "@/lib/inbox/types";
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

  return (
    <div className={`group flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <article
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
          isOutbound
            ? "rounded-br-md bg-teal-600 text-white"
            : "rounded-bl-md border border-zinc-200/90 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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
            isOutbound
              ? "text-teal-100"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <span>{formatMessageTime(message.created_at)}</span>
          {isNew && (
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Nuevo
            </span>
          )}
        </div>
      </article>
    </div>
  );
}
