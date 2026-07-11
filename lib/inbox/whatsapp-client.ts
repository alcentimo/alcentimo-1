/**
 * Cliente mínimo para WhatsApp Cloud API (Graph).
 * Usar solo en servidor con token de channel_integration_secrets o env de dev.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_API_VERSION = "v21.0";

export async function sendWhatsAppTextMessage(options: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<{ messageId: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${options.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: options.to,
      type: "text",
      text: { body: options.body },
    }),
  });

  const data = (await response.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "WhatsApp send failed");
  }

  const messageId = data.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp send: missing message id");

  return { messageId };
}

/**
 * Marca un mensaje entrante como leído (opcional, mejora métricas en WhatsApp).
 */
export async function markWhatsAppMessageAsRead(options: {
  phoneNumberId: string;
  accessToken: string;
  messageId: string;
}): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${options.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: options.messageId,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: { message: string } };
    throw new Error(data.error?.message ?? "WhatsApp mark read failed");
  }
}
