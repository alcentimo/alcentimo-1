import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductFacebookPostSummary {
  postId: string;
  permalinkUrl: string;
  publishedAt: string;
}

export async function getStoreFacebookPostsByProduct(
  supabase: SupabaseClient,
  storeId: string,
): Promise<Record<string, ProductFacebookPostSummary>> {
  const { data, error } = await supabase
    .from("facebook_page_posts")
    .select("id, product_id, permalink_url, published_at")
    .eq("store_id", storeId)
    .eq("status", "published")
    .not("product_id", "is", null)
    .order("published_at", { ascending: false });

  if (error) throw error;

  const map: Record<string, ProductFacebookPostSummary> = {};

  for (const row of data ?? []) {
    if (!row.product_id || map[row.product_id]) continue;
    if (!row.permalink_url) continue;

    map[row.product_id] = {
      postId: row.id,
      permalinkUrl: row.permalink_url,
      publishedAt: row.published_at ?? new Date().toISOString(),
    };
  }

  return map;
}
