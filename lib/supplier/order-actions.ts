"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import {
  isSupplierOrderStatus,
  type CreateSupplierOrderItemInput,
  type SupplierOrder,
  type SupplierOrderItem,
  type SupplierOrderStatus,
} from "@/lib/supplier/order-types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireSupplierUser(): Promise<{
  error?: string;
  user?: { id: string };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const email = resolveSupplierAuthEmail(user);
  const access = checkSupplierAccess(email);
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  return { user: { id: user.id } };
}

function mapItem(row: Record<string, unknown>): SupplierOrderItem {
  return {
    id: String(row.id),
    productId:
      typeof row.product_id === "string" && row.product_id
        ? row.product_id
        : null,
    productTitle: String(row.product_title ?? ""),
    quantity: Number(row.quantity) || 0,
    unitPriceUsd: Number(row.unit_price_usd) || 0,
    lineTotalUsd: Number(row.line_total_usd) || 0,
  };
}

function mapOrder(
  row: Record<string, unknown>,
  items: SupplierOrderItem[],
): SupplierOrder {
  const statusRaw = String(row.status ?? "pendiente");
  const status: SupplierOrderStatus = isSupplierOrderStatus(statusRaw)
    ? statusRaw
    : "pendiente";

  return {
    id: String(row.id),
    buyerName: String(row.buyer_name ?? ""),
    buyerPhone:
      typeof row.buyer_phone === "string" && row.buyer_phone.trim()
        ? row.buyer_phone.trim()
        : null,
    buyerAddress:
      typeof row.buyer_address === "string" && row.buyer_address.trim()
        ? row.buyer_address.trim()
        : null,
    shippingCarrier:
      typeof row.shipping_carrier === "string" && row.shipping_carrier.trim()
        ? row.shipping_carrier.trim()
        : null,
    shippingBranchName:
      typeof row.shipping_branch_name === "string" &&
      row.shipping_branch_name.trim()
        ? row.shipping_branch_name.trim()
        : null,
    shippingBranchAddress:
      typeof row.shipping_branch_address === "string" &&
      row.shipping_branch_address.trim()
        ? row.shipping_branch_address.trim()
        : null,
    status,
    trackingNumber:
      typeof row.tracking_number === "string" && row.tracking_number.trim()
        ? row.tracking_number.trim()
        : null,
    notes: String(row.notes ?? ""),
    totalUsd: Number(row.total_usd) || 0,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    items,
  };
}

export async function listSupplierOrders(): Promise<
  ActionResult<{ orders: SupplierOrder[] }>
> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const admin = createAdminClient();
  const { data: orderRows, error } = await admin
    .from("supplier_orders")
    .select(
      "id, buyer_name, buyer_phone, buyer_address, shipping_carrier, shipping_branch_name, shipping_branch_address, status, tracking_number, notes, total_usd, created_at, updated_at",
    )
    .eq("supplier_user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const ordersRaw = (orderRows as Record<string, unknown>[] | null) ?? [];
  if (ordersRaw.length === 0) {
    return { orders: [] };
  }

  const orderIds = ordersRaw.map((row) => String(row.id));
  const { data: itemRows, error: itemsError } = await admin
    .from("supplier_order_items")
    .select(
      "id, order_id, product_id, product_title, quantity, unit_price_usd, line_total_usd",
    )
    .in("order_id", orderIds);

  if (itemsError) {
    return { error: itemsError.message };
  }

  const itemsByOrder = new Map<string, SupplierOrderItem[]>();
  for (const raw of (itemRows as Record<string, unknown>[] | null) ?? []) {
    const orderId = String(raw.order_id);
    const list = itemsByOrder.get(orderId) ?? [];
    list.push(mapItem(raw));
    itemsByOrder.set(orderId, list);
  }

  return {
    orders: ordersRaw.map((row) =>
      mapOrder(row, itemsByOrder.get(String(row.id)) ?? []),
    ),
  };
}

export async function createSupplierOrder(input: {
  buyerName: string;
  buyerPhone?: string;
  buyerAddress?: string;
  shippingCarrier?: string;
  shippingBranchName?: string;
  shippingBranchAddress?: string;
  notes?: string;
  items: CreateSupplierOrderItemInput[];
  /** Reserva para marketplace: tienda del comerciante. */
  merchantStoreId?: string | null;
  merchantUserId?: string | null;
}): Promise<ActionResult<{ order: SupplierOrder }>> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const buyerName = input.buyerName.trim();
  if (buyerName.length < 2) {
    return { error: "Indica el nombre del comprador." };
  }

  if (!input.items?.length) {
    return { error: "Agrega al menos un producto al pedido." };
  }

  const admin = createAdminClient();
  const productIds = [...new Set(input.items.map((item) => item.productId))];

  const { data: productRows, error: productsError } = await admin
    .from("supplier_products")
    .select("id, title, stock, base_price_usd, created_by, is_active")
    .in("id", productIds)
    .eq("created_by", auth.user.id)
    .eq("is_active", true);

  if (productsError) {
    return { error: productsError.message };
  }

  const products = (productRows as Record<string, unknown>[] | null) ?? [];
  const productMap = new Map(products.map((row) => [String(row.id), row]));

  const lineSnapshots: Array<{
    product_id: string;
    product_title: string;
    quantity: number;
    unit_price_usd: number;
    line_total_usd: number;
  }> = [];

  let totalUsd = 0;

  for (const item of input.items) {
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      return { error: "La cantidad debe ser un entero mayor a 0." };
    }

    const product = productMap.get(item.productId);
    if (!product) {
      return { error: "Uno de los productos no está disponible." };
    }

    const stock = Number(product.stock) || 0;
    if (qty > stock) {
      return {
        error: `Stock insuficiente para «${String(product.title)}» (disponible: ${stock}).`,
      };
    }

    const unit = Math.round((Number(product.base_price_usd) || 0) * 100) / 100;
    const lineTotal = Math.round(unit * qty * 100) / 100;
    totalUsd += lineTotal;

    lineSnapshots.push({
      product_id: item.productId,
      product_title: String(product.title),
      quantity: qty,
      unit_price_usd: unit,
      line_total_usd: lineTotal,
    });
  }

  totalUsd = Math.round(totalUsd * 100) / 100;

  const { data: orderRow, error: orderError } = await admin
    .from("supplier_orders")
    .insert({
      supplier_user_id: auth.user.id,
      merchant_user_id: input.merchantUserId ?? null,
      merchant_store_id: input.merchantStoreId ?? null,
      buyer_name: buyerName.slice(0, 160),
      buyer_phone: input.buyerPhone?.trim().slice(0, 40) || null,
      buyer_address: input.buyerAddress?.trim().slice(0, 500) || null,
      shipping_carrier: input.shippingCarrier?.trim().slice(0, 60) || null,
      shipping_branch_name:
        input.shippingBranchName?.trim().slice(0, 160) || null,
      shipping_branch_address:
        input.shippingBranchAddress?.trim().slice(0, 320) || null,
      notes: (input.notes ?? "").trim().slice(0, 2000),
      status: "pendiente",
      total_usd: totalUsd,
    })
    .select(
      "id, buyer_name, buyer_phone, buyer_address, shipping_carrier, shipping_branch_name, shipping_branch_address, status, tracking_number, notes, total_usd, created_at, updated_at",
    )
    .single();

  if (orderError || !orderRow) {
    return { error: orderError?.message ?? "No se pudo crear el pedido." };
  }

  const orderId = String((orderRow as Record<string, unknown>).id);

  const { data: insertedItems, error: itemsError } = await admin
    .from("supplier_order_items")
    .insert(
      lineSnapshots.map((line) => ({
        order_id: orderId,
        ...line,
      })),
    )
    .select(
      "id, order_id, product_id, product_title, quantity, unit_price_usd, line_total_usd",
    );

  if (itemsError) {
    await admin.from("supplier_orders").delete().eq("id", orderId);
    return { error: itemsError.message };
  }

  for (const line of lineSnapshots) {
    const product = productMap.get(line.product_id);
    if (!product) continue;
    const nextStock = Math.max(0, (Number(product.stock) || 0) - line.quantity);
    const { error: stockError } = await admin
      .from("supplier_products")
      .update({
        stock: nextStock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.product_id)
      .eq("created_by", auth.user.id);

    if (stockError) {
      return {
        error: `Pedido creado, pero no se pudo actualizar el stock: ${stockError.message}`,
        order: mapOrder(
          orderRow as Record<string, unknown>,
          ((insertedItems as Record<string, unknown>[] | null) ?? []).map(
            mapItem,
          ),
        ),
      };
    }
  }

  revalidatePath("/proveedor/dashboard");

  return {
    order: mapOrder(
      orderRow as Record<string, unknown>,
      ((insertedItems as Record<string, unknown>[] | null) ?? []).map(mapItem),
    ),
  };
}

export async function updateSupplierOrderDispatch(input: {
  orderId: string;
  status: SupplierOrderStatus;
  trackingNumber?: string;
}): Promise<ActionResult<{ order: SupplierOrder }>> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const orderId = input.orderId.trim();
  if (!orderId) return { error: "Pedido inválido." };
  if (!isSupplierOrderStatus(input.status)) {
    return { error: "Estatus de despacho inválido." };
  }

  const tracking = (input.trackingNumber ?? "").trim().slice(0, 80);

  const admin = createAdminClient();
  const { data: orderRow, error } = await admin
    .from("supplier_orders")
    .update({
      status: input.status,
      tracking_number: tracking || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("supplier_user_id", auth.user.id)
    .select(
      "id, buyer_name, buyer_phone, buyer_address, shipping_carrier, shipping_branch_name, shipping_branch_address, status, tracking_number, notes, total_usd, created_at, updated_at",
    )
    .maybeSingle();

  if (error) return { error: error.message };
  if (!orderRow) return { error: "Pedido no encontrado." };

  const { data: itemRows, error: itemsError } = await admin
    .from("supplier_order_items")
    .select(
      "id, order_id, product_id, product_title, quantity, unit_price_usd, line_total_usd",
    )
    .eq("order_id", orderId);

  if (itemsError) return { error: itemsError.message };

  revalidatePath("/proveedor/dashboard");

  return {
    order: mapOrder(
      orderRow as Record<string, unknown>,
      ((itemRows as Record<string, unknown>[] | null) ?? []).map(mapItem),
    ),
  };
}
