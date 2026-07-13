import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import type { FacebookPostCallToAction } from "@/lib/facebook/call-to-action";
import { getIntegrationAccessToken } from "@/lib/inbox/integration-token";
import { resolveMetaPageId } from "@/lib/inbox/messenger-client";
import {
  fetchFacebookPostPermalink,
  publishPageProductPost,
} from "@/lib/facebook/page-posts";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 30;

const VALID_CTA = new Set<FacebookPostCallToAction>([
  "none",
  "message",
  "shop",
  "learn_more",
]);

interface PublishFacebookPostBody {
  productId?: string;
  message?: string;
  imageUrl?: string;
  callToAction?: FacebookPostCallToAction;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: PublishFacebookPostBody;
  try {
    body = (await request.json()) as PublishFacebookPostBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const message = body.message?.trim();
  const imageUrl = body.imageUrl?.trim();
  const callToAction: FacebookPostCallToAction = VALID_CTA.has(
    body.callToAction ?? "none",
  )
    ? (body.callToAction ?? "none")
    : "none";

  if (!productId) {
    return NextResponse.json({ error: "Producto no válido." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Escribe el texto de la publicación." }, { status: 400 });
  }

  if (!imageUrl) {
    return NextResponse.json(
      { error: "El producto necesita una imagen para publicar en Facebook." },
      { status: 400 },
    );
  }

  const { data: integration, error: integrationError } = await supabase
    .from("channel_integrations")
    .select("id, provider, external_account_id, config, is_active")
    .eq("store_id", auth.store.id)
    .eq("provider", "messenger")
    .eq("is_active", true)
    .maybeSingle();

  if (integrationError) {
    return NextResponse.json({ error: integrationError.message }, { status: 500 });
  }

  if (!integration) {
    return NextResponse.json(
      { error: "Conecta Facebook Messenger en Integraciones para publicar." },
      { status: 400 },
    );
  }

  const accessToken = await getIntegrationAccessToken(integration.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Token de Facebook no disponible. Reconecta la integración." },
      { status: 400 },
    );
  }

  const pageId = resolveMetaPageId(
    "messenger",
    integration.external_account_id,
    integration.config,
  );

  const actionLink = `${getSiteUrl()}/tienda/${auth.store.slug}`;

  let graphPostId: string;
  let rawResponse: Record<string, unknown>;

  try {
    const result = await publishPageProductPost({
      pageId,
      accessToken,
      message,
      imageUrl,
      callToAction,
      actionLink,
    });
    graphPostId = result.graphPostId;
    rawResponse = {
      ...result.raw,
      call_to_action: callToAction,
    };
  } catch (error) {
    const publishError =
      error instanceof Error ? error.message : "No se pudo publicar en Facebook.";
    return NextResponse.json({ error: publishError }, { status: 502 });
  }

  const permalinkUrl =
    (await fetchFacebookPostPermalink(graphPostId, accessToken)) ??
    `https://www.facebook.com/${graphPostId}`;

  const publishedAt = new Date().toISOString();
  const { data: saved, error: insertError } = await supabase
    .from("facebook_page_posts")
    .insert({
      store_id: auth.store.id,
      integration_id: integration.id,
      product_id: productId,
      page_id: pageId,
      graph_post_id: graphPostId,
      message,
      media_url: imageUrl,
      permalink_url: permalinkUrl,
      status: "published",
      published_at: publishedAt,
      raw_response: rawResponse,
    })
    .select("id, permalink_url, published_at")
    .single();

  if (insertError || !saved) {
    return NextResponse.json(
      {
        error: insertError?.message ?? "Publicado en Facebook pero no guardado localmente.",
        graphPostId,
        permalinkUrl,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    postId: saved.id,
    graphPostId,
    permalinkUrl: saved.permalink_url ?? permalinkUrl,
    publishedAt: saved.published_at ?? publishedAt,
  });
}
