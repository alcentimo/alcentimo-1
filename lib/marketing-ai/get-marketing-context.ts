import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MarketingAiContext } from "@/lib/marketing-ai/types";

function compactMarketingContext(context: MarketingAiContext): string {
  const lines = [
    `Tienda: ${context.storeName}${context.storeRubro ? ` (${context.storeRubro})` : ""}`,
    `Ventas hoy $${context.sales.todayUsd.toFixed(2)} | mes $${context.sales.monthToDateUsd.toFixed(2)} | ticket prom. $${context.sales.averageOrderUsd.toFixed(2)} | pedidos pendientes ${context.sales.pendingOrders}`,
    `Clientes: ${context.customers.registeredCount} registrados | 1 compra: ${context.customers.onePurchaseCount} | recompra: ${context.customers.repeatPurchaseCount}`,
    `Lentos: ${
      context.inventory.slowMoving
        .slice(0, 5)
        .map((p) => `${p.name} (stock ${p.availableStock})`)
        .join("; ") || "ninguno"
    }`,
    `Exceso: ${
      context.inventory.excessStock
        .slice(0, 5)
        .map((p) => `${p.name} (stock ${p.availableStock})`)
        .join("; ") || "ninguno"
    }`,
    `Top: ${
      context.sales.topProducts
        .slice(0, 5)
        .map((p) => `${p.name}×${p.unitsSold}`)
        .join(", ") || "n/d"
    }`,
    `Cupones activos: ${
      context.promotions.activeCoupons
        .map((c) => `${c.code} ${c.discountLabel}`)
        .join(", ") || "ninguno"
    }`,
    `Promos clientes: ${
      context.promotions.activeCustomerPromos
        .map((p) => `${p.code} ${p.discountPercent}%`)
        .join(", ") || "ninguna"
    }`,
    `Combos por categoría: ${
      context.comboOpportunityCategories.slice(0, 4).join(", ") || "n/d"
    }`,
  ];
  return lines.join("\n");
}

export { compactMarketingContext };

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function couponDiscountLabel(row: {
  discount_type?: string | null;
  discount_percent?: number | null;
  discount_fixed_usd?: number | null;
}): string {
  if (row.discount_type === "fixed") {
    return `$${Number(row.discount_fixed_usd || 0).toFixed(2)}`;
  }
  return `${Number(row.discount_percent || 0)}%`;
}

/**
 * Contexto de marketing para IA.
 * Usa el cliente pasado (sesión del dueño o admin del cron).
 */
export async function getMarketingAiContext(
  storeId: string,
  storeSlug: string,
  storeName: string,
  storeRubro: string | null,
  client?: SupabaseClient,
): Promise<MarketingAiContext> {
  const supabase = client ?? (await createClient());
  const todayIso = startOfTodayIso();
  const monthIso = startOfMonthIso();

  const [
    ordersResult,
    couponsResult,
    promotionsResult,
    profilesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_usd, estado, customer_user_id, created_at, items")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("coupons")
      .select(
        "code, discount_type, discount_percent, discount_fixed_usd, use_count, max_uses, is_active",
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .limit(12),
    supabase
      .from("promotions")
      .select("code, name, discount_percentage, use_count, is_active")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .limit(12),
    supabase
      .from("customer_profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("store_id", storeId),
    supabase
      .from("products")
      .select("id, name, stock, is_active, category_id")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("stock", { ascending: false })
      .limit(80),
  ]);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (couponsResult.error) throw new Error(couponsResult.error.message);
  if (promotionsResult.error) throw new Error(promotionsResult.error.message);
  if (productsResult.error) throw new Error(productsResult.error.message);

  const orders = ordersResult.data ?? [];
  let todayUsd = 0;
  let monthToDateUsd = 0;
  let pendingOrders = 0;
  const unitsByProduct = new Map<string, { name: string; units: number }>();
  const ordersByCustomer = new Map<string, number>();

  for (const order of orders) {
    const total = Number(order.total_usd) || 0;
    const created = String(order.created_at);
    if (created >= todayIso) todayUsd += total;
    if (created >= monthIso) monthToDateUsd += total;
    if (order.estado === "por_pagar" || order.estado === "pendiente") {
      pendingOrders += 1;
    }
    const userId = order.customer_user_id as string | null;
    if (userId) {
      ordersByCustomer.set(userId, (ordersByCustomer.get(userId) ?? 0) + 1);
    }
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const productId = String(row.product_id ?? "");
      const name = String(row.product_name ?? "Producto");
      const qty = Number(row.quantity) || 0;
      if (!productId || qty <= 0) continue;
      const prev = unitsByProduct.get(productId);
      unitsByProduct.set(productId, {
        name,
        units: (prev?.units ?? 0) + qty,
      });
    }
  }

  let onePurchaseCount = 0;
  let repeatPurchaseCount = 0;
  for (const count of ordersByCustomer.values()) {
    if (count <= 1) onePurchaseCount += 1;
    else repeatPurchaseCount += 1;
  }

  const recent = orders.slice(0, 20);
  const averageOrderUsd =
    recent.length > 0
      ? recent.reduce((sum, o) => sum + (Number(o.total_usd) || 0), 0) /
        recent.length
      : 0;

  const topProducts = [...unitsByProduct.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 8)
    .map((p) => ({ name: p.name, unitsSold: p.units }));

  const soldIds = new Set(unitsByProduct.keys());
  const products = productsResult.data ?? [];
  const slowMoving = products
    .filter((p) => {
      const stock = Number(p.stock) || 0;
      return stock >= 3 && !soldIds.has(String(p.id));
    })
    .slice(0, 8)
    .map((p) => ({
      name: String(p.name),
      productId: String(p.id),
      availableStock: Number(p.stock) || 0,
      priceUsd: null as number | null,
      unitsSoldThisMonth: 0,
    }));

  const excessStock = products
    .filter((p) => {
      const stock = Number(p.stock) || 0;
      const sold = unitsByProduct.get(String(p.id))?.units ?? 0;
      return stock >= 10 && sold <= 2;
    })
    .slice(0, 8)
    .map((p) => ({
      name: String(p.name),
      productId: String(p.id),
      availableStock: Number(p.stock) || 0,
      priceUsd: null as number | null,
      unitsSoldThisMonth: unitsByProduct.get(String(p.id))?.units ?? 0,
    }));

  const comboOpportunityCategories = [
    ...new Set(
      [...slowMoving, ...excessStock]
        .map((p) => {
          const product = products.find((row) => String(row.id) === p.productId);
          return product?.category_id ? String(product.category_id) : "";
        })
        .filter(Boolean),
    ),
  ].slice(0, 6);

  void storeSlug;

  return {
    storeName,
    storeRubro,
    generatedAt: new Date().toISOString(),
    sales: {
      todayUsd,
      monthToDateUsd,
      pendingOrders,
      averageOrderUsd,
      topProducts,
    },
    inventory: {
      slowMoving,
      excessStock,
    },
    customers: {
      registeredCount: profilesResult.count ?? 0,
      onePurchaseCount,
      repeatPurchaseCount,
    },
    promotions: {
      activeCoupons: (couponsResult.data ?? []).map((c) => ({
        code: String(c.code),
        discountLabel: couponDiscountLabel(c),
        useCount: Number(c.use_count) || 0,
        maxUses: Number(c.max_uses) || 0,
      })),
      activeCustomerPromos: (promotionsResult.data ?? []).map((p) => ({
        code: String(p.code),
        name: String(p.name),
        discountPercent: Number(p.discount_percentage) || 0,
        useCount: Number(p.use_count) || 0,
      })),
    },
    comboOpportunityCategories,
  };
}
