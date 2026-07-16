"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export type ProcessOrderResult = {
  error?: string;
  success?: boolean;
};

export interface CatalogOrderLine {
  variantId: string;
  quantity: number;
}

export async function processCatalogOrder(
  storeSlug: string,
  items: CatalogOrderLine[],
): Promise<ProcessOrderResult> {
  if (!storeSlug || items.length === 0) {
    return { error: "Pedido inválido." };
  }

  const payload = items.map((item) => ({
    variant_id: item.variantId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc(
    "process_catalog_order" as never,
    {
      p_store_slug: storeSlug,
      p_items: payload,
    } as never,
  );

  if (error) {
    return { error: error.message };
  }

  const result = data as { error?: string; success?: boolean } | null;

  if (result?.error) {
    return { error: result.error };
  }

  if (!result?.success) {
    return { error: "No se pudo procesar el pedido." };
  }

  revalidatePath(`/tienda/${storeSlug}`);
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");

  return { success: true };
}
