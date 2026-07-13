import type { InboxProvider } from "@/lib/inbox/types";

const GRAPH_API_VERSION = "v21.0";

export interface MetaMessengerUserProfile {
  name: string | null;
  profilePicUrl: string | null;
}

/**
 * Perfil del usuario de Messenger/Instagram (PSID o IGSID).
 * Requiere Page Access Token con pages_messaging.
 */
export async function fetchMetaMessengerUserProfile(
  psid: string,
  pageAccessToken: string,
): Promise<MetaMessengerUserProfile | null> {
  const normalizedPsid = psid.trim();
  const token = pageAccessToken.trim();

  if (!normalizedPsid || !token) {
    return null;
  }

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${normalizedPsid}`,
  );
  url.searchParams.set("fields", "name,first_name,last_name,profile_pic");
  url.searchParams.set("access_token", token);

  const response = await fetch(url.toString());
  const data = (await response.json()) as {
    name?: string;
    first_name?: string;
    last_name?: string;
    profile_pic?: string;
    error?: { message?: string; code?: number; type?: string };
  };

  if (!response.ok || data.error) {
    console.warn("[meta/profile] No se pudo obtener perfil del usuario", {
      psid: normalizedPsid,
      httpStatus: response.status,
      error: data.error?.message ?? null,
      code: data.error?.code ?? null,
      type: data.error?.type ?? null,
    });
    return null;
  }

  const name =
    data.name?.trim() ||
    [data.first_name, data.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    null;
  const profilePicUrl = data.profile_pic?.trim() ?? null;

  console.log("[meta/profile] Perfil de usuario obtenido", {
    psid: normalizedPsid,
    hasName: Boolean(name),
    hasProfilePic: Boolean(profilePicUrl),
  });

  return { name, profilePicUrl };
}

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
