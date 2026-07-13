"use client";

import { useState } from "react";
import {
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import {
  isMessengerProvider,
  MessengerChannelLabel,
} from "@/components/inbox/MessengerChannelLabel";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { ChatComposer } from "@/components/inbox/ChatComposer";
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
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Selecciona una conversación
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
  const isMessenger = isMessengerProvider(conversation.provider);

  function handleConversationAction(patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) {
    onConversationPatch(conversationId, patch);
  }

  return (
    <div className="inbox-chat-workspace">
      <header
        className={`inbox-chat-header ${
          isMessenger ? "inbox-chat-header--messenger" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <ChannelLogo
              provider={conversation.provider}
              className={isMessenger ? "h-12 w-12 shadow-md" : "h-11 w-11"}
            />
          )}
          <div className="min-w-0">
            {isMessenger && (
              <MessengerChannelLabel variant="prominent" className="mb-1" />
            )}
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {customerLabel}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
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

      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        focusMode={focusMode}
      />
    </div>
  );
}
