"use client";

import { useEffect, useRef } from "react";
import { formatSenderLabel } from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { CatalogListItem } from "@/lib/database.types";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";
import type { ChannelMessage } from "@/lib/inbox/types";
import { fetchInboxConversationMessages } from "@/lib/inbox/actions";
import { MessageBubble } from "@/components/inbox/MessageBubble";
import { ChatComposer } from "@/components/inbox/ChatComposer";
import { ContactAvatar } from "@/components/inbox/ContactAvatar";
import {
  getConversationStatusLabel,
  getConversationStatusTone,
} from "@/components/inbox/conversation-status";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { useInboxSession } from "@/components/inbox/InboxSessionProvider";
import type { ProductFacebookPostSummary } from "@/lib/facebook/get-store-facebook-posts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

interface ChatThreadProps {
  conversation: MessageConversation | null;
  products: CatalogListItem[];
  storeSlug: string;
  hasMessengerIntegration?: boolean;
  publishedPosts?: Record<string, ProductFacebookPostSummary>;
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
  onPostPublished,
}: ChatThreadProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const { getDraft, setDraft, patchConversation, messagesLoadingId } =
    useInboxSession();

  useEffect(() => {
    const conversationId = conversation?.conversationId;
    if (!conversationId || !isPersistedConversation(conversationId)) {
      return;
    }

    async function refreshDeliveryStatus() {
      const result = await fetchInboxConversationMessages(conversationId!);
      if (!result.messages) return;

      patchConversation(conversationId!, {
        messages: result.messages,
      });
    }

    const interval = window.setInterval(() => {
      void refreshDeliveryStatus();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [conversation?.conversationId, patchConversation]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || !conversation) return;

    node.scrollTop = node.scrollHeight;
  }, [conversation?.conversationId, conversation?.messages.length]);

  if (!conversation) {
    return (
      <div className="inbox-pro-chat-empty">
        <div className="inbox-pro-chat-empty-inner">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Selecciona una conversación
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Elige un chat de la lista para ver el historial y responder.
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
  const draft = getDraft(conversationId);
  const isLoadingMessages = messagesLoadingId === conversationId;

  function handleConversationAction(patch: {
    isArchived?: boolean;
    isSpam?: boolean;
    assignedTeam?: string | null;
  }) {
    patchConversation(conversationId, patch);
  }

  function handleActivityLogged(event: ClientActivityEvent) {
    patchConversation(conversationId, (current) => ({
      activityLog: [event, ...current.activityLog].slice(0, 20),
    }));
  }

  function handleMessageSent(message: ChannelMessage) {
    patchConversation(conversationId, (current) => ({
      messages: [...current.messages, message],
      lastMessage: message.message_text,
      lastMessageAt: message.created_at,
    }));
  }

  function handleOptimisticMessage(message: ChannelMessage) {
    patchConversation(conversationId, (current) => ({
      messages: [...current.messages, message],
      lastMessage: message.message_text,
      lastMessageAt: message.created_at,
    }));
  }

  function handleRemoveOptimisticMessage(messageId: string) {
    patchConversation(conversationId, (current) => ({
      messages: current.messages.filter(
        (message) => message.id !== messageId,
      ),
    }));
  }

  return (
    <div className="inbox-pro-chat">
      <header className="inbox-pro-chat-header">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar
            avatarUrl={conversation.avatarUrl}
            displayName={conversation.displayName}
            senderId={conversation.senderId}
            provider={conversation.provider}
            size="md"
            showChannelBadge
          />
          <div className="min-w-0">
            <p className="inbox-pro-chat-customer-name truncate">
              {customerLabel}
            </p>
            <p className="inbox-pro-chat-customer-meta truncate">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn("shrink-0", getConversationStatusTone(conversation.status))}
        >
          {getConversationStatusLabel(conversation.status)}
        </Badge>
      </header>

      <Separator />

      <div
        ref={threadRef}
        className="inbox-pro-chat-thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {isLoadingMessages && (
          <div className="inbox-pro-chat-thread-loading" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando mensajes…
          </div>
        )}

        {!isLoadingMessages && conversation.messages.length === 0 ? (
          <p className="inbox-pro-chat-thread-empty">
            No hay mensajes en esta conversación. Escribe abajo para iniciar el
            chat.
          </p>
        ) : (
          conversation.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              conversationId={conversation.conversationId}
              onConversationAction={handleConversationAction}
            />
          ))
        )}
      </div>

      <ChatComposer
        draft={draft}
        onDraftChange={(value) => setDraft(conversationId, value)}
        products={products}
        storeSlug={storeSlug}
        conversationId={conversationId}
        hasMessengerIntegration={hasMessengerIntegration}
        publishedPosts={publishedPosts}
        onActivityLogged={handleActivityLogged}
        onMessageSent={handleMessageSent}
        onOptimisticMessage={handleOptimisticMessage}
        onRemoveOptimisticMessage={handleRemoveOptimisticMessage}
        onPostPublished={onPostPublished}
      />
    </div>
  );
}
