"use client";

import { useEffect, useState } from "react";
import {
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
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
  onSendMessage?: (conversationId: string, text: string) => void;
  onSlashMenuOpenChange?: (open: boolean) => void;
}

export function ChatThread({
  conversation,
  onConversationPatch,
  onSendMessage,
  onSlashMenuOpenChange,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
  }, [conversation?.conversationId]);

  if (!conversation) {
    return (
      <div className="inbox-chat-empty">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Elige un chat para vender
        </p>
        <p className="mt-1 text-xs text-slate-400">
          <kbd className="inbox-kbd">↑</kbd> <kbd className="inbox-kbd">↓</kbd> para navegar entre chats.
        </p>
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

  function handleSend(text: string) {
    onSendMessage?.(conversationId, text);
    setDraft("");
  }

  return (
    <div className="inbox-chat-workspace">
      <header className="inbox-chat-header inbox-chat-header--messenger">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {customerLabel}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {conversation.phoneE164 ?? conversation.senderId}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getConversationStatusTone(conversation.status)}`}
        >
          {getConversationStatusLabel(conversation.status)}
        </span>
      </header>

      <div className="inbox-chat-thread inbox-chat-thread--sales">
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
        onSend={handleSend}
        onSlashMenuOpenChange={onSlashMenuOpenChange}
      />
    </div>
  );
}
