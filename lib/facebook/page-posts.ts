import type { FacebookPostCallToAction } from "@/lib/facebook/call-to-action";
import { buildMetaCallToActionPayload } from "@/lib/facebook/call-to-action";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface GraphErrorBody {
  error?: { message?: string };
}

async function graphFormPost<T>(
  path: string,
  accessToken: string,
  fields: Record<string, string>,
): Promise<T & GraphErrorBody> {
  const body = new URLSearchParams();
  body.set("access_token", accessToken);
  for (const [key, value] of Object.entries(fields)) {
    body.set(key, value);
  }

  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as T & GraphErrorBody;
  if (!response.ok) {
    throw new Error(data.error?.message ?? "No se pudo publicar en Facebook.");
  }

  return data;
}

async function uploadUnpublishedPagePhoto(options: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
}): Promise<string> {
  const data = await graphFormPost<{ id?: string }>(
    `/${options.pageId}/photos`,
    options.accessToken,
    {
      url: options.imageUrl,
      published: "false",
    },
  );

  const photoId = data.id?.trim();
  if (!photoId) {
    throw new Error("Facebook no devolvió el identificador de la imagen.");
  }

  return photoId;
}

export async function createPagePhotoPost(options: {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl: string;
}): Promise<{ graphPostId: string; raw: Record<string, unknown> }> {
  const data = await graphFormPost<{ id?: string; post_id?: string }>(
    `/${options.pageId}/photos`,
    options.accessToken,
    {
      url: options.imageUrl,
      message: options.message,
      published: "true",
    },
  );

  const graphPostId = String(data.post_id ?? data.id ?? "").trim();
  if (!graphPostId) {
    throw new Error("Facebook no devolvió el identificador de la publicación.");
  }

  return {
    graphPostId,
    raw: data as Record<string, unknown>,
  };
}

async function createPageFeedPost(options: {
  pageId: string;
  accessToken: string;
  message: string;
  photoId?: string;
  callToAction?: Record<string, unknown> | null;
}): Promise<{ graphPostId: string; raw: Record<string, unknown> }> {
  const fields: Record<string, string> = {
    message: options.message,
  };

  if (options.photoId) {
    fields["attached_media[0]"] = JSON.stringify({
      media_fbid: options.photoId,
    });
  }

  if (options.callToAction) {
    fields.call_to_action = JSON.stringify(options.callToAction);
  }

  const data = await graphFormPost<{ id?: string }>(
    `/${options.pageId}/feed`,
    options.accessToken,
    fields,
  );

  const graphPostId = data.id?.trim();
  if (!graphPostId) {
    throw new Error("Facebook no devolvió el identificador de la publicación.");
  }

  return {
    graphPostId,
    raw: data as Record<string, unknown>,
  };
}

export async function publishPageProductPost(options: {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl: string;
  callToAction?: FacebookPostCallToAction;
  actionLink?: string;
}): Promise<{ graphPostId: string; raw: Record<string, unknown> }> {
  const callToAction = options.callToAction ?? "none";

  if (callToAction === "none") {
    return createPagePhotoPost({
      pageId: options.pageId,
      accessToken: options.accessToken,
      message: options.message,
      imageUrl: options.imageUrl,
    });
  }

  const photoId = await uploadUnpublishedPagePhoto({
    pageId: options.pageId,
    accessToken: options.accessToken,
    imageUrl: options.imageUrl,
  });

  const ctaPayload = buildMetaCallToActionPayload(callToAction, {
    pageId: options.pageId,
    actionLink: options.actionLink,
  });

  return createPageFeedPost({
    pageId: options.pageId,
    accessToken: options.accessToken,
    message: options.message,
    photoId,
    callToAction: ctaPayload,
  });
}

export async function fetchFacebookPostPermalink(
  postId: string,
  accessToken: string,
): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${postId}`);
  url.searchParams.set("fields", "permalink_url");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  const data = (await response.json()) as GraphErrorBody & {
    permalink_url?: string;
  };

  if (!response.ok) {
    return null;
  }

  return typeof data.permalink_url === "string" ? data.permalink_url : null;
}
