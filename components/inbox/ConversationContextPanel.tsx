"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Clock3,
  Flag,
  MessageCircle,
  ShoppingBag,
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
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import {
  CONVERSATION_STATUS_OPTIONS,
  getConversationStatusLabel,
} from "@/components/inbox/conversation-status";

interface ConversationContextPanelProps {
  conversation: MessageConversation | null;
  storeCountry: string | null;
  recentSales: VentaWithProduct[];
  salesByConversationId?: Record<string, VentaWithProduct[]>;
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

function FieldRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Flag;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </span>
      <span className="truncate text-right font-medium text-slate-900 dark:text-slate-50">
        {value}
      </span>
    </div>
  );
}

export function ConversationContextPanel({
  conversation,
  storeCountry,
  recentSales,
  salesByConversationId = {},
  onConversationPatch,
  compact = false,
}: ConversationContextPanelProps) {
  const [tagInput, setTagInput] = useState("");
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [isUpdatingTags, startTagsTransition] = useTransition();

  useEffect(() => {
    setTagInput("");
  }, [conversation?.conversationId]);

  const purchaseHistory = useMemo(() => {
    if (!conversation) return [];

    const indexed = salesByConversationId[conversation.conversationId];
    if (indexed) return indexed;

    return getContactPurchaseHistory(conversation, recentSales);
  }, [conversation, recentSales, salesByConversationId]);

  if (!conversation) {
    return (
      <div className="inbox-context-panel-empty flex flex-1 flex-col justify-center px-6 py-10">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Contexto del cliente
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Selecciona una conversación para ver perfil y pedidos.
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
      <header className="inbox-context-profile px-4 pb-3 pt-4 md:px-5 md:pt-5">
        <div className="flex items-center gap-3">
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt=""
              className="h-11 w-11 rounded-2xl object-cover shadow-sm md:h-12 md:w-12"
            />
          ) : (
            <ChannelLogo provider={conversation.provider} className="h-11 w-11 md:h-12 md:w-12" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50 md:text-base">
              {customerLabel}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
        </div>
      </header>

      <div className="inbox-context-scroll space-y-3 overflow-y-auto px-4 pb-5 md:space-y-4 md:px-5 md:pb-6">
        <ContextModuleCard title="Datos del cliente" icon={UserRound}>
          <div className="space-y-3">
            <select
              value={conversation.status}
              disabled={isUpdatingStatus}
              onChange={(event) =>
                handleStatusChange(event.target.value as InboxConversationStatus)
              }
              className="inbox-context-input"
              aria-label="Estado de la conversación"
            >
              {CONVERSATION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getConversationStatusLabel(conversation.status)}
              {conversation.assignedTeam
                ? ` · ${conversation.assignedTeam}`
                : ""}
            </p>

            <div className="space-y-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <FieldRow icon={UserRound} label="Nombre" value={customerLabel} />
              <FieldRow
                icon={Flag}
                label="País"
                value={conversation.country ?? storeCountry ?? "Sin definir"}
              />
              <FieldRow
                icon={MessageCircle}
                label="Canal"
                value={conversation.provider}
              />
              <FieldRow
                icon={Clock3}
                label="Último mensaje"
                value={formatMessageTime(conversation.lastMessageAt)}
              />
            </div>
          </div>
        </ContextModuleCard>

        {!compact && (
          <ContextModuleCard
            title="Historial de pedidos"
            icon={ShoppingBag}
            className="inbox-context-module--orders"
          >
            {purchaseHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sin pedidos vinculados a este contacto.
              </p>
            ) : (
              <ul className="space-y-2">
                {purchaseHistory.map((sale) => (
                  <li
                    key={sale.id}
                    className="rounded-lg bg-white px-3 py-2.5 shadow-sm dark:bg-slate-900"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {sale.product_name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(sale.monto)} · {sale.cantidad} uds ·{" "}
                      {formatMessageTime(sale.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ContextModuleCard>
        )}

        {!compact && (
          <ContextModuleCard title="Etiquetas" icon={Tag}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {conversation.tags.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sin etiquetas. Añade una para segmentar leads.
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

              <div className="flex flex-col gap-2 sm:flex-row">
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
                  placeholder="Ej: Lead caliente"
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
            </div>
          </ContextModuleCard>
        )}
      </div>
    </div>
  );
}
