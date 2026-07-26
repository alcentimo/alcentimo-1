import type { OwnerAssistantContext } from "@/lib/ai/owner-assistant-types";
import type { StorefrontAssistantContext } from "@/lib/ai/storefront-assistant-types";
import { formatUsd } from "@/lib/format";

const MAX_PRODUCTS = 20;
const MAX_LIST = 5;

function joinItems(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

/** Resumen compacto del contexto del dueño — solo métricas y listas cortas. */
export function compactOwnerContextForPrompt(
  context: OwnerAssistantContext,
): string {
  const lines: string[] = [
    `Tienda: ${context.storeName}${context.storeRubro ? ` (${context.storeRubro})` : ""}`,
    `Ventas hoy ${formatUsd(context.sales.todayUsd)} | mes ${formatUsd(context.sales.monthToDateUsd)} | pedidos pendientes ${context.sales.pendingOrders}`,
    `Inventario: ${context.inventory.totalProducts} prod, agotados ${context.inventory.outOfStockCount}, bajo stock ${context.inventory.lowStockCount}, lento ${context.marketing.slowMovingCount}, exceso ${context.marketing.excessStockCount}`,
  ];

  if (context.exchangeRate.rate) {
    lines.push(`BCV: ${context.exchangeRate.rate} (${context.exchangeRate.effectiveDate ?? "hoy"})`);
  }

  const top = context.sales.topProducts
    .slice(0, MAX_LIST)
    .map((p) => `${p.name} ${p.unitsSold}u`);
  if (top.length) lines.push(`Top ventas: ${joinItems(top)}`);

  const slow = context.inventory.slowMoving
    .slice(0, MAX_LIST)
    .map((p) => `${p.name} stk${p.availableStock}`);
  if (slow.length) lines.push(`Baja rotación: ${joinItems(slow)}`);

  const low = context.inventory.lowStock
    .slice(0, MAX_LIST)
    .map((p) => `${p.name} stk${p.availableStock}`);
  if (low.length) lines.push(`Stock bajo: ${joinItems(low)}`);

  const pending = context.customers.pendingAccounts
    .slice(0, MAX_LIST)
    .map((a) => `${a.customerName} ${formatUsd(a.pendingTotalUsd)} (${a.pendingOrders} ped)`);
  if (pending.length) lines.push(`Pagos pendientes: ${joinItems(pending)}`);

  const customers = context.customers.topCustomers
    .slice(0, MAX_LIST)
    .map((c) => `${c.name ?? "Cliente"} ${c.orderCount}ped ${formatUsd(c.totalSpentUsd)}`);
  if (customers.length) lines.push(`Clientes VIP: ${joinItems(customers)}`);

  if (context.marketing.comboOpportunityCategories.length) {
    lines.push(
      `Categorías para combos: ${joinItems(context.marketing.comboOpportunityCategories)}`,
    );
  }

  return lines.join("\n");
}

/** Resumen compacto del catálogo público para soporte IA. */
export function compactStorefrontContextForPrompt(
  context: StorefrontAssistantContext,
): string {
  const lines: string[] = [
    `Tienda: ${context.storeName}${context.storeRubro ? ` (${context.storeRubro})` : ""}`,
    `Horario: ${context.openStatus}`,
    context.selectedLocationName
      ? `Sucursal consultada: ${context.selectedLocationName}`
      : null,
    context.paymentMethods.length
      ? `Pagos: ${joinItems(context.paymentMethods)}`
      : null,
    context.shippingOptions.length
      ? `Envíos: ${joinItems(context.shippingOptions.map((s) => s.label))}`
      : null,
    context.liveSearchQuery ? `Búsqueda: ${context.liveSearchQuery}` : null,
  ].filter((line): line is string => Boolean(line));

  const productLines = context.products.slice(0, MAX_PRODUCTS).map((product) => {
    const price =
      product.priceUsd != null ? formatUsd(product.priceUsd) : "consultar";
    if (product.variants.length <= 1) {
      return `${product.name} ${price} stk${product.availableStock}`;
    }
    const vars = product.variants
      .slice(0, 4)
      .map((v) => `${v.name}:${v.stock}`)
      .join("|");
    return `${product.name} ${price} | ${vars}`;
  });

  if (productLines.length) {
    lines.push("Productos:");
    lines.push(...productLines);
  }

  if (context.products.length > MAX_PRODUCTS) {
    lines.push(`(+${context.products.length - MAX_PRODUCTS} productos más en catálogo)`);
  }

  return lines.join("\n");
}
