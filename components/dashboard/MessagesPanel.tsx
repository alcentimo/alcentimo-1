"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MessageCircle, MessageSquare, User } from "lucide-react";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import { markChannelMessagesRead } from "@/lib/inbox/actions";
import { MessagesEmptyState } from "@/components/dashboard/MessagesEmptyState";

interface MessagesPanelProps {
  initialConversations: MessageConversation[];
  hasActiveIntegrations: boolean;
}

export function MessagesPanel({
  initialConversations,
  hasActiveIntegrations,
}: MessagesPanelProps) {
  const [conversations, setConversations] =
    useState(initialConversations);
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(
    initialConversations[0]?.senderId ?? null,
  );
  const [, startTransition] = useTransition();

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.senderId === selectedSenderId,
      ) ?? null,
    [conversations, selectedSenderId],
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  useEffect(() => {
    if (!selectedSenderId && conversations.length > 0) {
      setSelectedSenderId(conversations[0].senderId);
    }
  }, [conversations, selectedSenderId]);

  function handleSelectConversation(conversation: MessageConversation) {
    setSelectedSenderId(conversation.senderId);

    if (conversation.unreadCount === 0) return;

    startTransition(() => {
      void markChannelMessagesRead(
        conversation.integrationId,
        conversation.senderId,
      ).then((result) => {
        if (result.error) {
          console.error("[MessagesPanel] mark read error:", result.error);
          return;
        }

        setConversations((current) =>
          current.map((item) =>
            item.senderId === conversation.senderId
              ? {
                  ...item,
                  unreadCount: 0,
                  messages: item.messages.map((message) =>
                    message.direction === "inbound" &&
                    message.status === "unread"
                      ? { ...message, status: "read" as const }
                      : message,
                  ),
                }
              : item,
          ),
        );
      });
    });
  }

  if (conversations.length === 0) {
    return (
      <MessagesEmptyState hasActiveIntegrations={hasActiveIntegrations} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Conversaciones
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {conversations.length}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Clientes con mensajes activos
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </article>

        <article className="kpi-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Sin leer
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {totalUnread}
              </p>
              <p
                className={`mt-1 text-xs font-medium ${
                  totalUnread > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-teal-700 dark:text-teal-400"
                }`}
              >
                {totalUnread > 0
                  ? "Requieren tu atención"
                  : "Bandeja al día"}
              </p>
            </div>
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                totalUnread > 0
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
              }`}
            >
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </article>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <aside className="border-b border-zinc-200 dark:border-zinc-800 lg:border-b-0 lg:border-r">
            <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Clientes
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Selecciona una conversación para ver el hilo.
              </p>
            </div>

            <ul
              className="max-h-[28rem] overflow-y-auto lg:max-h-[calc(32rem-4.5rem)]"
              aria-label="Lista de conversaciones"
            >
              {conversations.map((conversation) => {
                const isActive = conversation.senderId === selectedSenderId;
                const preview =
                  conversation.lastMessage?.trim() || "Mensaje sin texto";

                return (
                  <li key={conversation.senderId}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation)}
                      className={`flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-4 text-left transition-colors last:border-b-0 dark:border-zinc-800/80 sm:px-5 ${
                        isActive
                          ? "bg-teal-50/80 dark:bg-teal-950/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        <User className="h-5 w-5" aria-hidden="true" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatSenderLabel(conversation.senderId)}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {preview}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="flex min-h-[24rem] flex-col bg-zinc-50/60 dark:bg-zinc-900/20">
            {selectedConversation ? (
              <>
                <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatSenderLabel(selectedConversation.senderId)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedConversation.messages.length} mensaje
                    {selectedConversation.messages.length !== 1 ? "s" : ""}
                  </p>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
                  {selectedConversation.messages.map((message) => {
                    const isOutbound = message.direction === "outbound";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                      >
                        <article
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                            isOutbound
                              ? "rounded-br-md bg-teal-600 text-white"
                              : "rounded-bl-md border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.message_text?.trim() || "Mensaje sin texto"}
                          </p>
                          <p
                            className={`mt-2 text-[11px] ${
                              isOutbound
                                ? "text-teal-100"
                                : "text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            {formatMessageTime(message.created_at)}
                            {!isOutbound && message.status === "unread" && (
                              <span className="ml-2 font-medium text-teal-600 dark:text-teal-400">
                                · Nuevo
                              </span>
                            )}
                          </p>
                        </article>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
                <div>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <MessageSquare className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    Selecciona un cliente
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    El hilo de mensajes aparecerá en este panel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
