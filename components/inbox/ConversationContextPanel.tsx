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
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";
import {
  buildClientActivityFeed,
  getSalesStatusActivityLabel,
} from "@/lib/inbox/contact-crm";
import {
  updateInboxContactPrivateNotes,
  updateInboxContactTags,
  updateInboxConversationSalesStatus,
} from "@/lib/inbox/actions";
import { getContactPurchaseHistory, isPersistedConversation } from "@/lib/inbox/contact-context";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import { SalesStatusSelect } from "@/components/inbox/SalesStatusSelect";
import { ContactCopyField } from "@/components/inbox/ContactCopyField";
import { ClientActivityList } from "@/components/inbox/ClientActivityList";

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

export function ConversationContextPanel({
  conversation,
  recentSales,
  salesByConversationId = {},
  onConversationPatch,
}: ConversationContextPanelProps) {
  const [tagInput, setTagInput] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [isUpdatingTags, startTagsTransition] = useTransition();
  const [isSavingNotes, startNotesTransition] = useTransition();

  useEffect(() => {
    setTagInput("");
    setNotesDraft(conversation?.privateNotes ?? "");
  }, [conversation?.conversationId, conversation?.privateNotes]);

  const purchaseHistory = useMemo(() => {
    if (!conversation) return [];

    const indexed = salesByConversationId[conversation.conversationId];
    if (indexed) return indexed;

    return getContactPurchaseHistory(conversation, recentSales);
  }, [conversation, recentSales, salesByConversationId]);

  const activityFeed = useMemo(() => {
    if (!conversation) return [];
    return buildClientActivityFeed(conversation, purchaseHistory);
  }, [conversation, purchaseHistory]);

  useEffect(() => {
    if (!conversation?.contactId) return;

    const timeout = window.setTimeout(() => {
      if (notesDraft === conversation.privateNotes) return;

      startNotesTransition(async () => {
        const result = await updateInboxContactPrivateNotes(
          conversation.contactId!,
          notesDraft,
        );
        if (result.error) {
          console.error("[ConversationContextPanel]", result.error);
        }
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [conversation, notesDraft]);

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
  const currentActivityLog = conversation.activityLog;
  const phoneValue = conversation.phoneE164 ?? conversation.senderId;

  function handleSalesStatusChange(salesStatus: InboxSalesStatus) {
    const activityEntry: ClientActivityEvent = {
      id: `status-local-${Date.now()}`,
      label: getSalesStatusActivityLabel(salesStatus),
      createdAt: new Date().toISOString(),
    };

    onConversationPatch(conversationId, {
      salesStatus,
      activityLog: [activityEntry, ...currentActivityLog].slice(0, 20),
    });

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

  function handleNotesChange(value: string) {
    setNotesDraft(value);
    onConversationPatch(conversationId, { privateNotes: value });
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
        <SalesStatusSelect
          value={conversation.salesStatus}
          disabled={isUpdatingStatus}
          onChange={handleSalesStatusChange}
        />
        <div className="inbox-contact-copy-grid mt-2">
          <ContactCopyField kind="phone" label="Teléfono" value={phoneValue} />
          <ContactCopyField kind="email" label="Email" value={conversation.email} />
        </div>
      </header>

      <div className="inbox-context-scroll overflow-y-auto">
        <ContextModuleCard title="Actividad">
          <ClientActivityList events={activityFeed} />
        </ContextModuleCard>

        <ContextModuleCard title="Pedidos">
          <Link href="/dashboard/ventas" className="inbox-order-create-btn">
            + Crear Pedido
          </Link>
          {purchaseHistory.length === 0 ? (
            <p className="inbox-context-module-empty">Sin pedidos vinculados.</p>
          ) : (
            <ul className="inbox-context-module-list">
              {purchaseHistory.slice(0, 2).map((sale) => (
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

        <ContextModuleCard title="Notas">
          <textarea
            value={notesDraft}
            onChange={(event) => handleNotesChange(event.target.value)}
            rows={3}
            placeholder="Información interna del cliente…"
            disabled={!conversation.contactId || isSavingNotes}
            className="inbox-context-notes-input"
          />
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
