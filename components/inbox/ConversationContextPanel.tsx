"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  formatMessageTime,
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import {
  updateInboxContactTags,
  updateInboxConversationSalesStatus,
} from "@/lib/inbox/actions";
import { getContactPurchaseHistory, isPersistedConversation } from "@/lib/inbox/contact-context";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import { SalesStatusSelect } from "@/components/inbox/SalesStatusSelect";

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
        <p className="text-xs font-medium text-slate-600">
          Selecciona un chat
        </p>
        <p className="mt-1 text-xs text-slate-400">
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

  function handleSalesStatusChange(salesStatus: InboxSalesStatus) {
    onConversationPatch(conversationId, { salesStatus });

    if (!canPersist) return;

    startStatusTransition(async () => {
      const result = await updateInboxConversationSalesStatus(
        conversationId,
        salesStatus,
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
        <SalesStatusSelect
          value={conversation.salesStatus}
          disabled={isUpdatingStatus}
          onChange={handleSalesStatusChange}
        />
        <div className="inbox-context-fields mt-2">
          <FieldRow label="País" value={conversation.country ?? storeCountry ?? "—"} />
          <FieldRow label="Último msg" value={formatMessageTime(conversation.lastMessageAt)} />
        </div>
      </header>

      <div className="inbox-context-scroll overflow-y-auto">
        <ContextModuleCard title="Pedidos">
          <Link href="/dashboard/ventas" className="inbox-order-create-btn">
            + Crear Pedido
          </Link>
          {purchaseHistory.length === 0 ? (
            <p className="inbox-context-module-empty">Sin pedidos vinculados.</p>
          ) : (
            <ul className="inbox-context-module-list">
              {purchaseHistory.map((sale) => (
                <li key={sale.id} className="inbox-context-module-row">
                  <p className="inbox-context-module-row-title">{sale.product_name}</p>
                  <p className="inbox-context-module-row-meta">
                    {formatCurrency(sale.monto)} · {sale.cantidad} u ·{" "}
                    {formatMessageTime(sale.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ContextModuleCard>

        <ContextModuleCard title="Etiquetas">
          <div className="inbox-context-module-list">
            <div className="flex flex-wrap gap-1.5">
              {conversation.tags.length === 0 ? (
                <p className="inbox-context-module-empty">Sin etiquetas.</p>
              ) : (
                conversation.tags.map((tag) => (
                  <span key={tag} className="inbox-context-tag">
                    {tag}
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-1.5 pt-1">
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
