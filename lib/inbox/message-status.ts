import type { InboxMessageStatus } from "@/lib/inbox/types";

const OUTBOUND_STATUS_LABELS: Record<InboxMessageStatus, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  read: "Visto",
  failed: "Error",
  received: "",
};

export function formatOutboundMessageStatus(
  status: InboxMessageStatus | undefined,
): string | null {
  if (!status) return null;
  const label = OUTBOUND_STATUS_LABELS[status];
  return label || null;
}

export function getOutboundStatusTone(
  status: InboxMessageStatus | undefined,
): string {
  switch (status) {
    case "read":
      return "inbox-bubble-delivery-status inbox-bubble-delivery-status--read";
    case "delivered":
      return "inbox-bubble-delivery-status inbox-bubble-delivery-status--delivered";
    case "failed":
      return "inbox-bubble-delivery-status inbox-bubble-delivery-status--failed";
    default:
      return "inbox-bubble-delivery-status";
  }
}
