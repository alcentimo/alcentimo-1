"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import {
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import {
  getConversationStatusLabel,
  getConversationStatusTone,
} from "@/components/inbox/conversation-status";

interface ChatThreadProps {
  conversation: MessageConversation | null;
  onConversationPatch: (
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) => void;
  focusMode?: boolean;
}

export function ChatThread({
  conversation,
  onConversationPatch,
  focusMode = false,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");

  if (!conversation) {
    return (
      <div className="inbox-chat-empty">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Selecciona una conversación
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            El hilo aparecerá aquí al instante.
          </p>
        </div>
      </div>
    );
  }

  const customerLabel = formatSenderLabel(
    conversation.senderId,
    conversation.displayName,
  );
  const conversationId = conversation.conversationId;

  function handleConversationAction(patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) {
    onConversationPatch(conversationId, patch);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200/90 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <ChannelLogo provider={conversation.provider} className="h-11 w-11" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {customerLabel}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getConversationStatusTone(conversation.status)}`}
        >
          {getConversationStatusLabel(conversation.status)}
        </span>
      </header>

      <div
        className={`inbox-chat-thread ${
          focusMode ? "inbox-chat-thread--focus" : ""
        }`}
      >
        {conversation.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            conversationId={conversation.conversationId}
            onConversationAction={handleConversationAction}
          />
        ))}
      </div>

      <footer className="border-t border-zinc-200/90 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
        <div className="flex items-end gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="Escribe una respuesta…"
            className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-teal-500 dark:focus:ring-teal-950/50"
          />
          <button
            type="button"
            disabled
            className="btn-brand inline-flex h-11 shrink-0 items-center justify-center gap-2 px-4 opacity-60"
            title="Respuestas salientes próximamente"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Enviar
          </button>
        </div>
        <p
          className={`mt-2 text-[11px] text-zinc-400 dark:text-zinc-500 ${
            focusMode ? "sr-only" : ""
          }`}
        >
          Las respuestas salientes estarán disponibles pronto.
        </p>
      </footer>
    </div>
  );
}
