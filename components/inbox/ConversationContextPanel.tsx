"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  Clock3,
  Flag,
  MessageCircle,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  UserRound,
} from "lucide-react";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { InboxConversationStatus } from "@/lib/inbox/types";
import {
  updateInboxContactTags,
  updateInboxConversationStatus,
} from "@/lib/inbox/actions";
import { getContactPurchaseHistory, isPersistedConversation } from "@/lib/inbox/contact-context";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import {
  CONVERSATION_STATUS_OPTIONS,
  getConversationStatusLabel,
} from "@/components/inbox/conversation-status";

interface ConversationContextPanelProps {
  conversation: MessageConversation | null;
  storeCountry: string | null;
  recentSales: VentaWithProduct[];
  onConversationPatch: (
    conversationId: string,
    patch: Partial<MessageConversation>,
  ) => void;
  compact?: boolean;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ContextFieldLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Flag;
  children: ReactNode;
}) {
  return (
    <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      {children}
    </dt>
  );
}

function ContextSectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Flag;
  children: ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
      <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      {children}
    </h3>
  );
}

export function ConversationContextPanel({
  conversation,
  storeCountry,
  recentSales,
  onConversationPatch,
  compact = false,
}: ConversationContextPanelProps) {
  const [tagInput, setTagInput] = useState("");
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [isUpdatingTags, startTagsTransition] = useTransition();

  const purchaseHistory = useMemo(
    () =>
      conversation
        ? getContactPurchaseHistory(conversation, recentSales)
        : [],
    [conversation, recentSales],
  );

  if (!conversation) {
    return (
      <div className="inbox-context-panel-empty flex flex-1 flex-col justify-center px-6 py-10">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Contexto del cliente
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Selecciona una conversación para ver perfil, compras y estado.
        </p>
      </div>
    );
  }

  const customerLabel = formatSenderLabel(
    conversation.senderId,
    conversation.displayName,
  );
  const canPersist = isPersistedConversation(conversation.conversationId);
  const conversationId = conversation.conversationId;
  const contactId = conversation.contactId;
  const currentTags = conversation.tags;

  function handleStatusChange(status: InboxConversationStatus) {
    onConversationPatch(conversationId, { status });

    if (!canPersist) return;

    startStatusTransition(async () => {
      const result = await updateInboxConversationStatus(
        conversationId,
        status,
      );
      if (result.error) {
        console.error("[ConversationContextPanel]", result.error);
      }
    });
  }

  function handleAddTag() {
    const nextTag = tagInput.trim();
    if (!nextTag || currentTags.includes(nextTag)) return;

    const nextTags = [...currentTags, nextTag];
    onConversationPatch(conversationId, { tags: nextTags });
    setTagInput("");

    if (!contactId) return;

    startTagsTransition(async () => {
      const result = await updateInboxContactTags(contactId, nextTags);
      if (result.error) {
        console.error("[ConversationContextPanel]", result.error);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700"
            />
          ) : (
            <ChannelLogo provider={conversation.provider} className="h-12 w-12" />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {customerLabel}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
        </div>
      </header>

      <div className="inbox-context-scroll space-y-7 overflow-y-auto px-5 pb-6">
        <section className="space-y-3">
          <ContextSectionTitle icon={SlidersHorizontal}>
            Estado de la conversación
          </ContextSectionTitle>
          <select
            value={conversation.status}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              handleStatusChange(event.target.value as InboxConversationStatus)
            }
            className="inbox-context-input"
          >
            {CONVERSATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Actual: {getConversationStatusLabel(conversation.status)}
            {conversation.assignedTeam
              ? ` · Asignado a ${conversation.assignedTeam}`
              : ""}
          </p>
        </section>

        <section className="space-y-3">
          <ContextSectionTitle icon={UserRound}>
            Datos del cliente
          </ContextSectionTitle>
          <dl className="space-y-3.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <ContextFieldLabel icon={UserRound}>Nombre</ContextFieldLabel>
              <dd className="font-medium text-slate-900 dark:text-slate-50">
                {customerLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <ContextFieldLabel icon={Flag}>País</ContextFieldLabel>
              <dd className="font-medium text-slate-900 dark:text-slate-50">
                {conversation.country ?? storeCountry ?? "Sin definir"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <ContextFieldLabel icon={MessageCircle}>Canal</ContextFieldLabel>
              <dd className="font-medium capitalize text-slate-900 dark:text-slate-50">
                {conversation.provider}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <ContextFieldLabel icon={Clock3}>Último mensaje</ContextFieldLabel>
              <dd className="font-medium text-slate-900 dark:text-slate-50">
                {formatMessageTime(conversation.lastMessageAt)}
              </dd>
            </div>
          </dl>
        </section>

        {!compact && (
          <section className="space-y-3">
            <ContextSectionTitle icon={Tag}>Etiquetas</ContextSectionTitle>

            <div className="flex flex-wrap gap-2">
              {conversation.tags.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sin etiquetas aún.
                </p>
              ) : (
                conversation.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Tag className="h-3 w-3 opacity-60" aria-hidden="true" />
                    {tag}
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Nueva etiqueta"
                disabled={!conversation.contactId || isUpdatingTags}
                className="inbox-context-input min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!conversation.contactId || isUpdatingTags}
                className="btn-brand-outline shrink-0 px-3 py-2 text-sm"
              >
                Añadir
              </button>
            </div>
          </section>
        )}

        {!compact && (
          <section className="inbox-purchase-history-card space-y-3">
            <ContextSectionTitle icon={ShoppingBag}>
              Historial de compras
            </ContextSectionTitle>

            {purchaseHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No encontramos ventas vinculadas a este contacto todavía.
              </p>
            ) : (
              <ul className="space-y-2">
                {purchaseHistory.map((sale) => (
                  <li
                    key={sale.id}
                    className="rounded-lg bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-700/60"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {sale.product_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(sale.monto)} · {sale.cantidad} uds ·{" "}
                      {formatMessageTime(sale.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
