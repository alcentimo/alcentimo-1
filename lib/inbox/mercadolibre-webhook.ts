import { mlApiFetch } from "@/lib/mercadolibre";

export interface MlNotification {
  resource: string;
  user_id: number;
  topic: string;
  application_id?: number;
  attempts?: number;
  sent?: string;
  received?: string;
}

export interface MlNotificationBatch {
  messages?: MlNotification[];
}

export type MlWebhookTopic = "questions" | "orders" | "created_orders";

const SUPPORTED_TOPICS = new Set<MlWebhookTopic>([
  "questions",
  "orders",
  "created_orders",
]);

export function parseMlNotifications(payload: unknown): MlNotification[] {
  if (!payload || typeof payload !== "object") return [];

  const batch = payload as MlNotificationBatch;
  if (Array.isArray(batch.messages)) {
    return batch.messages.filter(isMlNotification);
  }

  return isMlNotification(payload) ? [payload] : [];
}

function isMlNotification(value: unknown): value is MlNotification {
  if (!value || typeof value !== "object") return false;

  const n = value as Partial<MlNotification>;
  return (
    typeof n.resource === "string" &&
    typeof n.user_id === "number" &&
    typeof n.topic === "string"
  );
}

export function isSupportedMlTopic(topic: string): topic is MlWebhookTopic {
  return SUPPORTED_TOPICS.has(topic as MlWebhookTopic);
}

export function extractMlResourceId(resource: string): string | null {
  const segments = resource.split("/").filter(Boolean);
  return segments.at(-1) ?? null;
}

interface MlQuestion {
  id: number;
  text: string;
  status: string;
  item_id: string;
  from?: { id?: number; nickname?: string };
}

interface MlOrder {
  id: number;
  status: string;
  buyer?: { id?: number; nickname?: string };
  total_amount?: number;
  currency_id?: string;
}

export async function fetchMlQuestion(
  questionId: string,
  lookup: { externalAccountId: string },
): Promise<MlQuestion | null> {
  const response = await mlApiFetch(
    lookup,
    `/questions/${questionId}`,
  );

  if (!response.ok) {
    console.warn("[mercadolibre-webhook] question fetch failed:", questionId);
    return null;
  }

  return (await response.json()) as MlQuestion;
}

export async function fetchMlOrder(
  orderId: string,
  lookup: { externalAccountId: string },
): Promise<MlOrder | null> {
  const response = await mlApiFetch(lookup, `/orders/${orderId}`);

  if (!response.ok) {
    console.warn("[mercadolibre-webhook] order fetch failed:", orderId);
    return null;
  }

  return (await response.json()) as MlOrder;
}

export function formatQuestionMessage(question: MlQuestion): string {
  const buyer = question.from?.nickname ?? "Comprador";
  return `[Pregunta · ${question.item_id}] ${buyer}: ${question.text}`;
}

export function formatOrderMessage(order: MlOrder, topic: MlWebhookTopic): string {
  const buyer = order.buyer?.nickname ?? "Comprador";
  const amount =
    order.total_amount != null
      ? ` · ${order.currency_id ?? ""} ${order.total_amount}`
      : "";
  const label = topic === "created_orders" ? "Venta creada" : "Nueva venta";
  return `[${label} #${order.id}] ${buyer} · estado: ${order.status}${amount}`;
}

export function resolveQuestionSenderId(question: MlQuestion): string {
  return question.from?.id != null
    ? String(question.from.id)
    : `question:${question.id}`;
}

export function resolveOrderSenderId(order: MlOrder): string {
  return order.buyer?.id != null
    ? String(order.buyer.id)
    : `order:${order.id}`;
}

export async function buildInboundMessageFromNotification(
  notification: MlNotification,
  lookup: { externalAccountId: string },
): Promise<{
  senderId: string;
  messageText: string;
  platformMessageId: string;
  sentAt?: string;
} | null> {
  const resourceId = extractMlResourceId(notification.resource);
  if (!resourceId) return null;

  const sentAt = notification.sent ?? notification.received;

  if (notification.topic === "questions") {
    const question = await fetchMlQuestion(resourceId, lookup);
    if (!question || question.status === "deleted") return null;

    return {
      senderId: resolveQuestionSenderId(question),
      messageText: formatQuestionMessage(question),
      platformMessageId: `ml:question:${question.id}`,
      sentAt,
    };
  }

  if (
    notification.topic === "orders" ||
    notification.topic === "created_orders"
  ) {
    const order = await fetchMlOrder(resourceId, lookup);
    if (!order) {
      return {
        senderId: `order:${resourceId}`,
        messageText: `[Venta #${resourceId}] Notificación recibida (${notification.topic})`,
        platformMessageId: `ml:order:${resourceId}:${notification.topic}`,
        sentAt,
      };
    }

    return {
      senderId: resolveOrderSenderId(order),
      messageText: formatOrderMessage(order, notification.topic),
      platformMessageId: `ml:order:${order.id}:${notification.topic}`,
      sentAt,
    };
  }

  return null;
}
