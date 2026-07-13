const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface GraphErrorBody {
  error?: { message?: string };
}

export async function createPagePhotoPost(options: {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl: string;
}): Promise<{ graphPostId: string; raw: Record<string, unknown> }> {
  const body = new URLSearchParams();
  body.set("url", options.imageUrl);
  body.set("message", options.message);
  body.set("published", "true");
  body.set("access_token", options.accessToken);

  const response = await fetch(`${GRAPH_BASE}/${options.pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as {
    id?: string;
    post_id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "No se pudo publicar en Facebook.");
  }

  const graphPostId = String(data.post_id ?? data.id ?? "").trim();
  if (!graphPostId) {
    throw new Error("Facebook no devolvió el identificador de la publicación.");
  }

  return {
    graphPostId,
    raw: data as Record<string, unknown>,
  };
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
