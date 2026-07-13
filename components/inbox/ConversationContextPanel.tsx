"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  formatSenderLabel,
} from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import {
  getSalesStatusActivityLabel,
} from "@/lib/inbox/contact-crm";
import {
  updateInboxContactPrivateNotes,
  updateInboxContactTags,
  updateInboxConversationSalesStatus,
} from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import { SalesStatusSelect } from "@/components/inbox/SalesStatusSelect";
import { ContactCopyStrip } from "@/components/inbox/ContactCopyStrip";

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

function getProfileTitle(conversation: MessageConversation): string {
  const displayName = conversation.displayName?.trim();
  if (displayName) return displayName;

  return formatSenderLabel(conversation.senderId, conversation.displayName);
}

export function ConversationContextPanel({
  conversation,
  onConversationPatch,
}: ConversationContextPanelProps) {
  const [tagInput, setTagInput] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [isUpdatingStatus, startStatusTransition] = useTransition();
  const [isUpdatingTags, startTagsTransition] = useTransition();
  const [, startNotesTransition] = useTransition();

  useEffect(() => {
    setTagInput("");
    setNotesDraft(conversation?.privateNotes ?? "");
  }, [conversation?.conversationId, conversation?.privateNotes]);

  const whatsappUrl = useMemo(() => {
    if (!conversation) return null;
    const phone = conversation.phoneE164 ?? conversation.senderId;
    return buildWhatsAppOrderUrl(phone, "");
  }, [conversation]);

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
          Gestiona pedidos, notas y etiquetas del cliente.
        </p>
      </div>
    );
  }

  const profileTitle = getProfileTitle(conversation);
  const canPersist = isPersistedConversation(conversation.conversationId);
  const conversationId = conversation.conversationId;
  const contactId = conversation.contactId;
  const currentTags = conversation.tags;
  const currentActivityLog = conversation.activityLog;
  const phoneValue = conversation.phoneE164 ?? conversation.senderId;

  function handleSalesStatusChange(salesStatus: InboxSalesStatus) {
    onConversationPatch(conversationId, {
      salesStatus,
      activityLog: [
        {
          id: `status-local-${Date.now()}`,
          label: getSalesStatusActivityLabel(salesStatus),
          createdAt: new Date().toISOString(),
        },
        ...currentActivityLog,
      ].slice(0, 20),
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
        <p className="inbox-context-profile-name">{profileTitle}</p>

        <div className="inbox-context-status-row mt-2">
          <SalesStatusSelect
            value={conversation.salesStatus}
            disabled={isUpdatingStatus}
            onChange={handleSalesStatusChange}
            className="min-w-0 flex-1"
          />
        </div>

        <ContactCopyStrip
          phone={phoneValue}
          email={conversation.email}
          whatsappUrl={whatsappUrl}
        />
      </header>

      <div className="inbox-context-scroll overflow-y-auto">
        <ContextModuleCard title="Pedidos">
          <Link href="/dashboard/ventas" className="inbox-order-create-btn">
            + Crear Pedido
          </Link>
          <p className="inbox-context-module-empty mt-2">
            Historial completo en{" "}
            <Link href="/dashboard/ventas" className="text-[#1877F2] hover:underline">
              Ventas
            </Link>
            .
          </p>
        </ContextModuleCard>

        <ContextModuleCard title="Notas">
          <textarea
            value={notesDraft}
            onChange={(event) => handleNotesChange(event.target.value)}
            rows={3}
            placeholder="Información interna del cliente…"
            disabled={!conversation.contactId}
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
