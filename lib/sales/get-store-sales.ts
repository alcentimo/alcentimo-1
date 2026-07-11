import { createClient } from "@/lib/supabase/server";
import type { VentaWithProduct } from "@/lib/sales/types";

export async function getStoreSales(
  storeId: string,
  limit = 50,
): Promise<VentaWithProduct[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ventas")
    .select(
      `
      id,
      store_id,
      usuario_id,
      producto_id,
      variant_id,
      cantidad,
      monto,
      metodo_pago,
      canal_venta,
      external_reference,
      notas,
      created_at,
      products:producto_id (
        name,
        categories:category_id (
          name
        ),
        product_images (
          thumb_url,
          is_primary
        )
      )
    `,
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const product = row.products as {
      name?: string;
      categories?: { name?: string } | null;
      product_images?: { thumb_url?: string | null; is_primary?: boolean }[];
    } | null;

    const images = product?.product_images ?? [];
    const primary =
      images.find((img) => img.is_primary) ?? images[0] ?? null;

    return {
      id: row.id,
      store_id: row.store_id,
      usuario_id: row.usuario_id,
      producto_id: row.producto_id,
      variant_id: row.variant_id,
      cantidad: Number(row.cantidad),
      monto: Number(row.monto),
      metodo_pago: row.metodo_pago,
      canal_venta: row.canal_venta,
      external_reference: row.external_reference,
      notas: row.notas,
      created_at: row.created_at,
      product_name: product?.name ?? "Producto",
      category_name: product?.categories?.name ?? null,
      thumb_url: primary?.thumb_url ?? null,
    };
  });
}
