import type { InboxProvider } from "@/lib/inbox/types";

const GRAPH_API_VERSION = "v21.0";

export async function sendMetaTextMessage(options: {
  pageId: string;
  accessToken: string;
  recipientId: string;
  body: string;
  provider: InboxProvider;
}): Promise<{ messageId: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${options.pageId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: options.recipientId },
      messaging_type: "RESPONSE",
      message: { text: options.body },
    }),
  });

  const data = (await response.json()) as {
    message_id?: string;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Meta send failed");
  }

  const messageId = data.message_id?.trim();
  if (!messageId) {
    throw new Error("Meta send: missing message id");
  }

  return { messageId };
}

export function resolveMetaPageId(
  provider: InboxProvider,
  externalAccountId: string,
  config: Record<string, unknown> | null,
): string {
  if (provider === "instagram") {
    const pageId = config?.page_id;
    if (typeof pageId === "string" && pageId.trim()) {
      return pageId.trim();
    }
  }

  return externalAccountId;
}
