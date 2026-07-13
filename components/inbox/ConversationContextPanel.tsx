"use client";

import { useMemo, useTransition } from "react";
import Link from "next/link";
import { formatSenderLabel } from "@/lib/inbox/get-store-messages";
import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";
import { getSalesStatusActivityLabel } from "@/lib/inbox/contact-crm";
import {
  updateInboxConversationSalesStatus,
} from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { ContextModuleCard } from "@/components/inbox/ContextModuleCard";
import { SalesStatusSelect } from "@/components/inbox/SalesStatusSelect";
import { ContactCopyStrip } from "@/components/inbox/ContactCopyStrip";
import { ContactAvatar } from "@/components/inbox/ContactAvatar";
import { ContactQuickNotes } from "@/components/inbox/ContactQuickNotes";
import { ContactTagsEditor } from "@/components/inbox/ContactTagsEditor";
import { useInboxSession } from "@/components/inbox/InboxSessionProvider";

interface ConversationContextPanelProps {
  conversation: MessageConversation | null;
  storeCountry: string | null;
  recentSales: VentaWithProduct[];
  salesByConversationId?: Record<string, VentaWithProduct[]>;
}

function getProfileTitle(conversation: MessageConversation): string {
  const displayName = conversation.displayName?.trim();
  if (displayName) return displayName;

  return formatSenderLabel(conversation.senderId, conversation.displayName);
}

export function ConversationContextPanel({
  conversation,
}: ConversationContextPanelProps) {
  const { patchConversation } = useInboxSession();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const whatsappUrl = useMemo(() => {
    if (!conversation) return null;
    const phone = conversation.phoneE164 ?? conversation.senderId;
    return buildWhatsAppOrderUrl(phone, "");
  }, [conversation]);

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
  const currentActivityLog = conversation.activityLog;
  const phoneValue = conversation.phoneE164 ?? conversation.senderId;

  function handleSalesStatusChange(salesStatus: InboxSalesStatus) {
    patchConversation(conversationId, {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="inbox-context-profile">
        <div className="flex items-center gap-3">
          <ContactAvatar
            avatarUrl={conversation.avatarUrl}
            displayName={conversation.displayName}
            senderId={conversation.senderId}
            provider={conversation.provider}
            size="md"
          />
          <p className="inbox-context-profile-name min-w-0 flex-1">
            {profileTitle}
          </p>
        </div>

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

        <ContactQuickNotes
          key={`notes-${conversationId}-${contactId ?? "none"}`}
          contactId={contactId}
          conversationId={conversationId}
          initialNotes={conversation.privateNotes}
          onNotesChange={(privateNotes) =>
            patchConversation(conversationId, { privateNotes })
          }
        />

        <ContactTagsEditor
          key={`tags-${conversationId}-${contactId ?? "none"}`}
          contactId={contactId}
          conversationId={conversationId}
          initialTags={conversation.tags}
          onTagsChange={(tags) => patchConversation(conversationId, { tags })}
        />
      </div>
    </div>
  );
}
