"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import {
  CONVERSATION_STATUS_OPTIONS,
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
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="inbox-context-field">
      <span className="inbox-context-field-label">{label}</span>
      <span className="inbox-context-field-value">{value}</span>
    </div>
  );
}

export function ConversationContextPanel({
  conversation,
  storeCountry,
  recentSales,
  salesByConversationId = {},
  onConversationPatch,
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
      <div className="inbox-context-panel-empty flex flex-1 flex-col justify-center px-4 py-8">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Selecciona un chat
        </p>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Datos del cliente y pedidos aquí.
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
      <header className="inbox-context-profile">
        <p className="inbox-context-profile-name">{customerLabel}</p>
        <p className="inbox-context-profile-meta">
          {conversation.phoneE164 ?? conversation.senderId}
        </p>
      </header>

      <div className="inbox-context-scroll space-y-2.5 overflow-y-auto px-3 pb-4">
        <ContextModuleCard title="Cliente">
          <select
            value={conversation.status}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              handleStatusChange(event.target.value as InboxConversationStatus)
            }
            className="inbox-context-input inbox-context-input--compact"
            aria-label="Estado de la conversación"
          >
            {CONVERSATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="inbox-context-fields">
            <FieldRow label="País" value={conversation.country ?? storeCountry ?? "—"} />
            <FieldRow label="Último msg" value={formatMessageTime(conversation.lastMessageAt)} />
          </div>
        </ContextModuleCard>

        <ContextModuleCard title="Pedidos">
          {purchaseHistory.length === 0 ? (
            <p className="inbox-context-empty">Sin pedidos vinculados.</p>
          ) : (
            <ul className="inbox-context-orders">
              {purchaseHistory.map((sale) => (
                <li key={sale.id} className="inbox-context-order">
                  <p className="inbox-context-order-name">{sale.product_name}</p>
                  <p className="inbox-context-order-meta">
                    {formatCurrency(sale.monto)} · {sale.cantidad} u ·{" "}
                    {formatMessageTime(sale.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ContextModuleCard>

        <ContextModuleCard title="Etiquetas">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {conversation.tags.length === 0 ? (
                <p className="inbox-context-empty">Sin etiquetas.</p>
              ) : (
                conversation.tags.map((tag) => (
                  <span key={tag} className="inbox-context-tag">
                    {tag}
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-1.5">
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
                className="inbox-context-input inbox-context-input--compact min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!conversation.contactId || isUpdatingTags}
                className="inbox-context-tag-add"
              >
                +
              </button>
            </div>
          </div>
        </ContextModuleCard>
      </div>
    </div>
  );
}
