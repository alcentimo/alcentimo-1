"use client";

import { useMemo, useState, useTransition } from "react";
import { ShoppingBag, Tag } from "lucide-react";
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
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ConversationContextPanel({
  conversation,
  storeCountry,
  recentSales,
  onConversationPatch,
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
      <aside className="inbox-context-panel inbox-context-panel-empty">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Contexto del cliente
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona una conversación para ver perfil, compras y estado.
        </p>
      </aside>
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
    <aside className="inbox-context-panel">
      <header className="border-b border-zinc-200/90 px-4 py-4 dark:border-zinc-800 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Cliente
        </p>
        <div className="mt-3 flex items-center gap-3">
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <ChannelLogo provider={conversation.provider} className="h-12 w-12" />
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {customerLabel}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {conversation.phoneE164 ?? conversation.senderId}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 overflow-y-auto px-4 py-5 sm:px-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Estado de la conversación
          </h3>
          <select
            value={conversation.status}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              handleStatusChange(event.target.value as InboxConversationStatus)
            }
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-teal-950/50"
          >
            {CONVERSATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Actual: {getConversationStatusLabel(conversation.status)}
            {conversation.assignedTeam
              ? ` · Asignado a ${conversation.assignedTeam}`
              : ""}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Datos del cliente
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {customerLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">País</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {conversation.country ?? storeCountry ?? "Sin definir"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">Canal</dt>
              <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                {conversation.provider}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-500 dark:text-zinc-400">Último mensaje</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {formatMessageTime(conversation.lastMessageAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Etiquetas
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {conversation.tags.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sin etiquetas aún.
              </p>
            ) : (
              conversation.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
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
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-teal-950/50"
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

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Historial de compras
            </h3>
          </div>

          {purchaseHistory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No encontramos ventas vinculadas a este contacto todavía.
            </p>
          ) : (
            <ul className="space-y-2">
              {purchaseHistory.map((sale) => (
                <li
                  key={sale.id}
                  className="rounded-xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {sale.product_name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(sale.monto)} · {sale.cantidad} uds ·{" "}
                    {formatMessageTime(sale.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
