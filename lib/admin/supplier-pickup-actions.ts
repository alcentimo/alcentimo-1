"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { syncCatalogOrderFromSupplierHold } from "@/lib/dropship/sync-catalog-from-supplier";
import { SUPPLIER_ORDER_STATUS_LABELS } from "@/lib/supplier/order-types";

export interface AdminSupplierPickupOrder {
  id: string;
  status: "pendiente" | "preparando" | "despachado";
  statusLabel: string;
  createdAt: string;
  totalUsd: number;
  productSummary: string;
  supplierUserId: string;
  companyName: string;
  warehouseAddress: string;
  pickupHours: string;
}

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

export async function listAdminSupplierPickupOrders(): Promise<{
  error?: string;
  orders?: AdminSupplierPickupOrder[];
}> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data: orderRows, error: ordersError } = await admin
    .from("supplier_orders")
    .select("id, status, created_at, total_usd, supplier_user_id")
    .in("status", ["pendiente", "preparando"])
    .order("created_at", { ascending: false })
    .limit(80);

  if (ordersError) return { error: ordersError.message };

  const orders = (orderRows as Record<string, unknown>[] | null) ?? [];
  const supplierIds = [
    ...new Set(orders.map((row) => String(row.supplier_user_id ?? "")).filter(Boolean)),
  ];

  const profileById = new Map<
    string,
    { companyName: string; warehouseAddress: string; pickupHours: string }
  >();
  if (supplierIds.length > 0) {
    const full = await admin
      .from("supplier_profiles")
      .select("user_id, company_name, warehouse_address, pickup_hours")
      .in("user_id", supplierIds);

    let profileRows: Record<string, unknown>[] = [];
    if (
      full.error &&
      (full.error.message.includes("warehouse_address") ||
        full.error.message.includes("pickup_hours"))
    ) {
      const fallback = await admin
        .from("supplier_profiles")
        .select("user_id, company_name")
        .in("user_id", supplierIds);
      if (fallback.error) return { error: fallback.error.message };
      profileRows = (fallback.data as Record<string, unknown>[] | null) ?? [];
    } else if (full.error) {
      return { error: full.error.message };
    } else {
      profileRows = (full.data as Record<string, unknown>[] | null) ?? [];
    }

    for (const row of profileRows) {
      profileById.set(String(row.user_id ?? ""), {
        companyName: String(row.company_name ?? "").trim() || "Proveedor",
        warehouseAddress: String(row.warehouse_address ?? "").trim(),
        pickupHours: String(row.pickup_hours ?? "").trim(),
      });
    }
  }

  const orderIds = orders.map((row) => String(row.id ?? "")).filter(Boolean);
  const summaryByOrder = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await admin
      .from("supplier_order_items")
      .select("order_id, product_title, quantity")
      .in("order_id", orderIds);
    if (itemsError) return { error: itemsError.message };
    const grouped = new Map<string, string[]>();
    for (const item of (itemRows as Record<string, unknown>[] | null) ?? []) {
      const orderId = String(item.order_id ?? "");
      const line = `${Number(item.quantity) || 0}× ${String(item.product_title ?? "Producto")}`;
      const list = grouped.get(orderId) ?? [];
      list.push(line);
      grouped.set(orderId, list);
    }
    for (const [orderId, lines] of grouped) {
      summaryByOrder.set(orderId, lines.join(", "));
    }
  }

  return {
    orders: orders.map((row) => {
      const id = String(row.id ?? "");
      const supplierUserId = String(row.supplier_user_id ?? "");
      const statusRaw = String(row.status ?? "pendiente");
      const status =
        statusRaw === "preparando" || statusRaw === "despachado"
          ? statusRaw
          : "pendiente";
      const profile = profileById.get(supplierUserId);
      return {
        id,
        status,
        statusLabel: SUPPLIER_ORDER_STATUS_LABELS[status],
        createdAt: String(row.created_at ?? ""),
        totalUsd: Number(row.total_usd) || 0,
        productSummary: summaryByOrder.get(id) || "Sin productos",
        supplierUserId,
        companyName: profile?.companyName ?? "Proveedor",
        warehouseAddress: profile?.warehouseAddress ?? "",
        pickupHours: profile?.pickupHours ?? "",
      };
    }),
  };
}

export async function markSupplierOrderCollectedByAlcentimo(input: {
  orderId: string;
}): Promise<{ error?: string }> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const orderId = input.orderId.trim();
  if (!orderId) return { error: "Pedido inválido." };

  const admin = createAdminClient();
  const { data: current, error: loadError } = await admin
    .from("supplier_orders")
    .select("id, status, source_catalog_order_id")
    .eq("id", orderId)
    .maybeSingle();

  if (loadError) return { error: loadError.message };
  if (!current) return { error: "Pedido no encontrado." };

  const { error: updateError } = await admin
    .from("supplier_orders")
    .update({
      status: "despachado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) return { error: updateError.message };

  const mapped = current as Record<string, unknown>;
  await syncCatalogOrderFromSupplierHold({
    sourceCatalogOrderId:
      typeof mapped.source_catalog_order_id === "string"
        ? mapped.source_catalog_order_id
        : null,
    supplierStatus: "despachado",
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/proveedor/dashboard");
  revalidatePath("/proveedor/dashboard/hub/pedidos");
  return {};
}
