import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreInventory } from "@/lib/inventory";
import { countLowStock, countOutOfStock } from "@/lib/inventory/stock-status";
import { getStoreInboxConversations } from "@/lib/inbox/get-store-messages";
import { getStoreSales } from "@/lib/sales/get-store-sales";

export interface HomeSummary {
  todaySalesTotal: number;
  todaySalesCount: number;
  pendingOrders: number;
  unreadMessages: number;
  productCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getHomeSummary(
  supabase: SupabaseClient,
  storeId: string,
  storeSlug: string,
): Promise<HomeSummary> {
  const todayStart = startOfToday();

  const [sales, conversations, inventory] = await Promise.all([
    getStoreSales(storeId, 500),
    getStoreInboxConversations(supabase, storeId),
    getStoreInventory(storeSlug),
  ]);

  const todaySales = sales.filter(
    (sale) => new Date(sale.created_at) >= todayStart,
  );

  const pendingOrders = conversations.filter(
    (conversation) =>
      !conversation.isArchived &&
      !conversation.isSpam &&
      (conversation.salesStatus === "new" ||
        conversation.salesStatus === "negotiating"),
  ).length;

  const unreadMessages = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );

  return {
    todaySalesTotal: todaySales.reduce((total, sale) => total + sale.monto, 0),
    todaySalesCount: todaySales.length,
    pendingOrders,
    unreadMessages,
    productCount: inventory.products.length,
    outOfStockCount: countOutOfStock(inventory.products),
    lowStockCount: countLowStock(inventory.products),
  };
}
