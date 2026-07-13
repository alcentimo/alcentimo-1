import type { MessageConversation } from "@/lib/inbox/get-store-messages";
import type { VentaWithProduct } from "@/lib/sales/types";
import { getSalesStatusLabel } from "@/lib/inbox/sales-status";
import type { InboxSalesStatus } from "@/lib/inbox/sales-status";

export interface ClientActivityEvent {
  id: string;
  label: string;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readPrivateNotes(metadata: Record<string, unknown> | null): string {
  const value = metadata?.private_notes;
  return typeof value === "string" ? value : "";
}

export function readContactEmail(metadata: Record<string, unknown> | null): string | null {
  const value = metadata?.email;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseActivityLog(value: unknown): ClientActivityEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry, index) => {
      if (!isRecord(entry)) return null;

      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const createdAt =
        typeof entry.created_at === "string"
          ? entry.created_at
          : typeof entry.createdAt === "string"
            ? entry.createdAt
            : "";

      if (!label || !createdAt) return null;

      const id =
        typeof entry.id === "string" && entry.id.trim()
          ? entry.id
          : `activity-${index}-${createdAt}`;

      return { id, label, createdAt };
    })
    .filter((entry): entry is ClientActivityEvent => entry !== null);
}

export function buildClientActivityFeed(
  conversation: MessageConversation,
  sales: VentaWithProduct[],
  limit = 3,
): ClientActivityEvent[] {
  const merged: ClientActivityEvent[] = [
    ...conversation.activityLog,
    ...sales.map((sale) => ({
      id: `sale-${sale.id}`,
      label: `Pedido creado · ${sale.product_name}`,
      createdAt: sale.created_at,
    })),
  ];

  const unique = new Map<string, ClientActivityEvent>();
  for (const event of merged) {
    unique.set(`${event.id}-${event.createdAt}`, event);
  }

  return [...unique.values()]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function createActivityEntry(
  label: string,
  type = "event",
): { id: string; type: string; label: string; created_at: string } {
  return {
    id: `${type}-${Date.now()}`,
    type,
    label,
    created_at: new Date().toISOString(),
  };
}

export function appendActivityEntries(
  current: unknown,
  entries: ReturnType<typeof createActivityEntry>[],
  maxEntries = 20,
): ReturnType<typeof createActivityEntry>[] {
  const existing = Array.isArray(current)
    ? current.filter(isRecord).map((entry, index) => {
        const label = typeof entry.label === "string" ? entry.label : "";
        const created_at =
          typeof entry.created_at === "string" ? entry.created_at : "";
        const type = typeof entry.type === "string" ? entry.type : "event";
        const id =
          typeof entry.id === "string"
            ? entry.id
            : `activity-${index}-${created_at}`;

        if (!label || !created_at) return null;

        return { id, type, label, created_at };
      })
    : [];

  const normalized = existing.filter(
    (entry): entry is ReturnType<typeof createActivityEntry> => entry !== null,
  );

  return [...entries, ...normalized].slice(0, maxEntries);
}

export function getSalesStatusActivityLabel(status: InboxSalesStatus): string {
  return `Estado → ${getSalesStatusLabel(status)}`;
}
