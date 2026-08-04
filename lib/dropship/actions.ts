"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  applyRetailPriceToProduct,
} from "@/lib/dropship/price-change";
import { suggestRetailFromWholesaleCost } from "@/lib/dropship/margin";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { normalizeDropshipPricingSettings } from "@/lib/dropship/margin";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

export type DropshipLinkRow = {
  id: string;
  productId: string;
  productName: string;
  supplierProductId: string;
  supplierProductTitle: string;
  supplierCostUsd: number;
  autoReprice: boolean;
  lastCostUsd: number | null;
  suggestedRetailUsd: number | null;
};

export type SupplierPriceAlertRow = {
  id: string;
  supplierProductTitle: string;
  productId: string | null;
  oldCostUsd: number;
  newCostUsd: number;
  suggestedRetailUsd: number | null;
  previousRetailUsd: number | null;
  status: string;
  createdAt: string;
};

export async function listStoreDropshipLinks(): Promise<
  ActionResult<{ links: DropshipLinkRow[] }>
> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const settings = await getStoreSettingsConfig(auth.store.id);
  const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);

  const { data, error } = await admin
    .from("store_dropship_links")
    .select(
      "id, product_id, supplier_product_id, auto_reprice, last_cost_usd, products(name), supplier_products(title, base_price_usd)",
    )
    .eq("store_id", auth.store.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const links: DropshipLinkRow[] = ((data as Record<string, unknown>[] | null) ?? []).map(
    (row) => {
      const product = row.products as { name?: string } | null;
      const supplier = row.supplier_products as {
        title?: string;
        base_price_usd?: number;
      } | null;
      const cost = Number(supplier?.base_price_usd) || 0;
      return {
        id: String(row.id),
        productId: String(row.product_id),
        productName: String(product?.name ?? "Producto"),
        supplierProductId: String(row.supplier_product_id),
        supplierProductTitle: String(supplier?.title ?? "Mayorista"),
        supplierCostUsd: cost,
        autoReprice: Boolean(row.auto_reprice),
        lastCostUsd:
          row.last_cost_usd != null ? Number(row.last_cost_usd) : null,
        suggestedRetailUsd: suggestRetailFromWholesaleCost(cost, dropship),
      };
    },
  );

  return { links };
}

export async function listActiveSupplierCatalogForMerchant(): Promise<
  ActionResult<{
    products: Array<{
      id: string;
      title: string;
      basePriceUsd: number;
      stock: number;
    }>;
  }>
> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select("id, title, base_price_usd, stock")
    .eq("is_active", true)
    .order("title", { ascending: true })
    .limit(200);

  if (error) return { error: error.message };

  return {
    products: ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ""),
      basePriceUsd: Number(row.base_price_usd) || 0,
      stock: Number(row.stock) || 0,
    })),
  };
}

export async function linkStoreDropshipProduct(input: {
  productId: string;
  supplierProductId: string;
  autoReprice?: boolean;
}): Promise<ActionResult<{ linkId: string }>> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const productId = input.productId.trim();
  const supplierProductId = input.supplierProductId.trim();
  if (!productId || !supplierProductId) {
    return { error: "Selecciona producto de tienda y producto mayorista." };
  }

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", auth.store.id)
    .maybeSingle();
  if (!product) return { error: "Producto de tienda no encontrado." };

  const { data: supplier } = await admin
    .from("supplier_products")
    .select("id, base_price_usd")
    .eq("id", supplierProductId)
    .eq("is_active", true)
    .maybeSingle();
  if (!supplier) return { error: "Producto mayorista no disponible." };

  const cost = Number(supplier.base_price_usd) || 0;

  const { data, error } = await admin
    .from("store_dropship_links")
    .upsert(
      {
        store_id: auth.store.id,
        product_id: productId,
        supplier_product_id: supplierProductId,
        auto_reprice: Boolean(input.autoReprice),
        last_cost_usd: cost,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  return { linkId: String(data.id) };
}

export async function unlinkStoreDropshipProduct(
  linkId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("store_dropship_links")
    .delete()
    .eq("id", linkId.trim())
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ajustes");
  return {};
}

export async function listUnreadSupplierPriceAlerts(): Promise<
  ActionResult<{ alerts: SupplierPriceAlertRow[]; unreadCount: number }>
> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_price_change_alerts")
    .select(
      "id, supplier_product_title, product_id, old_cost_usd, new_cost_usd, suggested_retail_usd, previous_retail_usd, status, created_at",
    )
    .eq("store_id", auth.store.id)
    .in("status", ["unread", "read"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return { error: error.message };

  const alerts: SupplierPriceAlertRow[] = (
    (data as Record<string, unknown>[] | null) ?? []
  ).map((row) => ({
    id: String(row.id),
    supplierProductTitle: String(row.supplier_product_title ?? ""),
    productId:
      typeof row.product_id === "string" && row.product_id
        ? row.product_id
        : null,
    oldCostUsd: Number(row.old_cost_usd) || 0,
    newCostUsd: Number(row.new_cost_usd) || 0,
    suggestedRetailUsd:
      row.suggested_retail_usd != null
        ? Number(row.suggested_retail_usd)
        : null,
    previousRetailUsd:
      row.previous_retail_usd != null
        ? Number(row.previous_retail_usd)
        : null,
    status: String(row.status ?? "unread"),
    createdAt: String(row.created_at ?? ""),
  }));

  return {
    alerts,
    unreadCount: alerts.filter((alert) => alert.status === "unread").length,
  };
}

export async function dismissSupplierPriceAlert(
  alertId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_price_change_alerts")
    .update({
      status: "dismissed",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/catalogo");
  return {};
}

export async function applySuggestedPriceFromAlert(
  alertId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data: alert, error } = await admin
    .from("supplier_price_change_alerts")
    .select(
      "id, product_id, suggested_retail_usd, new_cost_usd, store_id",
    )
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!alert) return { error: "Alerta no encontrada." };

  const productId =
    typeof alert.product_id === "string" ? alert.product_id : null;
  if (!productId) {
    return { error: "La alerta no está vinculada a un producto de tu tienda." };
  }

  let suggested =
    alert.suggested_retail_usd != null
      ? Number(alert.suggested_retail_usd)
      : null;

  if (suggested == null) {
    const settings = await getStoreSettingsConfig(auth.store.id);
    const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
    suggested = suggestRetailFromWholesaleCost(
      Number(alert.new_cost_usd) || 0,
      dropship,
    );
  }

  if (suggested == null) {
    return {
      error:
        "Configura una regla de margen en Ajustes → Dropshipping para calcular el precio sugerido.",
    };
  }

  const applied = await applyRetailPriceToProduct(admin, productId, suggested);
  if (!applied.ok) return { error: applied.error };

  await admin
    .from("supplier_price_change_alerts")
    .update({
      status: "applied",
      suggested_retail_usd: suggested,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id);

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  return {};
}
