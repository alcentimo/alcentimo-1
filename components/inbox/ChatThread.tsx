"use client";

import { useEffect, useState } from "react";
import {
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { CatalogListItem } from "@/lib/database.types";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";
import type { ChannelMessage } from "@/lib/inbox/types";
import { fetchInboxConversationMessages } from "@/lib/inbox/actions";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { ChatComposer } from "@/components/inbox/ChatComposer";
import { ChannelBadge } from "@/components/inbox/ChannelBadge";
import {
  getConversationStatusLabel,
  getConversationStatusTone,
} from "@/components/inbox/conversation-status";
import { isPersistedConversation } from "@/lib/inbox/contact-context";

import type { ProductFacebookPostSummary } from "@/lib/facebook/get-store-facebook-posts";

interface ChatThreadProps {
  conversation: MessageConversation | null;
  products: CatalogListItem[];
  storeSlug: string;
  hasMessengerIntegration?: boolean;
  publishedPosts?: Record<string, ProductFacebookPostSummary>;
  onConversationPatch: (
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) => void;
  onPostPublished?: (
    productId: string,
    permalinkUrl: string,
    publishedAt: string,
  ) => void;
}

export function ChatThread({
  conversation,
  products,
  storeSlug,
  hasMessengerIntegration = false,
  publishedPosts = {},
  onConversationPatch,
  onPostPublished,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const conversationId = conversation?.conversationId;
    if (!conversationId || !isPersistedConversation(conversationId)) {
      return;
    }

    async function refreshDeliveryStatus() {
      const result = await fetchInboxConversationMessages(conversationId!);
      if (!result.messages) return;

      onConversationPatch(conversationId!, {
        messages: result.messages,
      });
    }

    const interval = window.setInterval(() => {
      void refreshDeliveryStatus();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [conversation?.conversationId, onConversationPatch]);

  if (!conversation) {
    return (
      <div className="inbox-chat-empty">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Elige un chat para vender
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Responde rápido y cierra el pedido.
        </p>
      </div>
    );
  }

  const customerLabel = formatSenderLabel(
    conversation.senderId,
    conversation.displayName,
  );
  const conversationId = conversation.conversationId;
  const currentActivityLog = conversation.activityLog;
  const currentMessages = conversation.messages;

  function handleConversationAction(patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) {
    onConversationPatch(conversationId, patch);
  }

  function handleActivityLogged(event: ClientActivityEvent) {
    onConversationPatch(conversationId, {
      activityLog: [event, ...currentActivityLog].slice(0, 20),
    });
  }

  function handleMessageSent(message: ChannelMessage) {
    onConversationPatch(conversationId, {
      messages: [...currentMessages, message],
      lastMessage: message.message_text,
      lastMessageAt: message.created_at,
    });
  }

  return (
    <div className="inbox-chat-workspace">
      <header className="inbox-chat-header inbox-chat-header--messenger">
        <div className="flex min-w-0 items-center gap-2">
          <ChannelBadge provider={conversation.provider} compact />
          <div className="min-w-0">
            <p className="inbox-chat-customer-name truncate">
              {customerLabel}
            </p>
            <p className="inbox-chat-customer-meta truncate">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
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
        products={products}
        storeSlug={storeSlug}
        conversationId={conversationId}
        hasMessengerIntegration={hasMessengerIntegration}
        publishedPosts={publishedPosts}
        onActivityLogged={handleActivityLogged}
        onMessageSent={handleMessageSent}
        onPostPublished={onPostPublished}
      />
    </div>
  );
}
