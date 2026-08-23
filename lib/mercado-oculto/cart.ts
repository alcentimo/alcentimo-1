/** Carrito del mercado oculto (persistencia en sessionStorage). */

export const MERCADO_CART_STORAGE_KEY = "alcentimo-mercado-oculto-cart-v3";

export interface MercadoCartItem {
  productId: string;
  /** Combinación talla/color u otra SKU; agrupa líneas distintas. */
  variantId?: string;
  productName: string;
  priceUsd: number;
  quantity: number;
  thumbUrl: string | null;
  /** ID del mayorista (auth user) para agrupar órdenes. */
  supplierUserId: string;
  supplierLabel: string;
  availableStock: number;
}

export function mercadoCartLineKey(item: {
  productId: string;
  variantId?: string;
}): string {
  return item.variantId
    ? `${item.productId}::${item.variantId}`
    : item.productId;
}

export type MercadoCartSupplierGroup = {
  supplierUserId: string;
  supplierLabel: string;
  items: MercadoCartItem[];
  itemCount: number;
  subtotalUsd: number;
};

/** Borrador por proveedor listo para concreta una orden futura. */
export type MercadoSupplierOrderDraft = {
  supplierUserId: string;
  supplierLabel: string;
  lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPriceUsd: number;
    lineTotalUsd: number;
  }>;
  itemCount: number;
  subtotalUsd: number;
};

export function sanitizeMercadoCartItems(raw: unknown): MercadoCartItem[] {
  if (!Array.isArray(raw)) return [];

  const items: MercadoCartItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<MercadoCartItem> & {
      supplierId?: string;
    };
    const productId =
      typeof row.productId === "string" ? row.productId.trim() : "";
    const productName =
      typeof row.productName === "string" ? row.productName.trim() : "";
    const quantity = Math.floor(Number(row.quantity));
    const priceUsd = Number(row.priceUsd);
    const availableStock = Math.max(
      0,
      Math.floor(Number(row.availableStock) || 0),
    );
    const supplierUserId =
      typeof row.supplierUserId === "string" && row.supplierUserId.trim()
        ? row.supplierUserId.trim()
        : typeof row.supplierId === "string" && row.supplierId.trim()
          ? row.supplierId.trim()
          : "";

    const variantId =
      typeof row.variantId === "string" && row.variantId.trim()
        ? row.variantId.trim().slice(0, 80)
        : undefined;

    if (!productId || !productName || quantity <= 0 || !Number.isFinite(priceUsd)) {
      continue;
    }

    items.push({
      productId,
      ...(variantId ? { variantId } : {}),
      productName,
      priceUsd,
      quantity: availableStock > 0 ? Math.min(quantity, availableStock) : quantity,
      thumbUrl:
        typeof row.thumbUrl === "string" && row.thumbUrl.trim()
          ? row.thumbUrl.trim()
          : null,
      supplierUserId,
      supplierLabel:
        typeof row.supplierLabel === "string" && row.supplierLabel.trim()
          ? row.supplierLabel.trim()
          : "Moriche",
      availableStock,
    });
  }
  return items;
}

export function readMercadoCart(): MercadoCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.sessionStorage.getItem(MERCADO_CART_STORAGE_KEY) ??
      window.sessionStorage.getItem("alcentimo-mercado-oculto-cart-v2") ??
      window.sessionStorage.getItem("alcentimo-mercado-oculto-cart-v1");
    if (!raw) return [];
    return sanitizeMercadoCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeMercadoCart(items: MercadoCartItem[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    MERCADO_CART_STORAGE_KEY,
    JSON.stringify(sanitizeMercadoCartItems(items)),
  );
  // Limpia clave legacy para no mezclar formatos.
  window.sessionStorage.removeItem("alcentimo-mercado-oculto-cart-v1");
  window.sessionStorage.removeItem("alcentimo-mercado-oculto-cart-v2");
}

export function clearMercadoCart(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MERCADO_CART_STORAGE_KEY);
  window.sessionStorage.removeItem("alcentimo-mercado-oculto-cart-v1");
  window.sessionStorage.removeItem("alcentimo-mercado-oculto-cart-v2");
}

export function mercadoCartItemCount(items: MercadoCartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function mercadoCartSubtotal(items: MercadoCartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0);
}

/** Agrupa líneas del carrito por mayorista (orden de primera aparición). */
export function groupMercadoCartBySupplier(
  items: MercadoCartItem[],
): MercadoCartSupplierGroup[] {
  const groups = new Map<string, MercadoCartSupplierGroup>();
  const order: string[] = [];

  for (const item of items) {
    const key = item.supplierUserId || `__label:${item.supplierLabel}`;
    const existing = groups.get(key);
    if (!existing) {
      order.push(key);
      groups.set(key, {
        supplierUserId: item.supplierUserId,
        supplierLabel: item.supplierLabel,
        items: [item],
        itemCount: item.quantity,
        subtotalUsd: item.priceUsd * item.quantity,
      });
      continue;
    }
    existing.items.push(item);
    existing.itemCount += item.quantity;
    existing.subtotalUsd += item.priceUsd * item.quantity;
  }

  return order.map((key) => groups.get(key)!);
}

/** Prepara un borrador de orden por cada proveedor del carrito. */
export function buildMercadoSupplierOrderDrafts(
  items: MercadoCartItem[],
): MercadoSupplierOrderDraft[] {
  return groupMercadoCartBySupplier(items).map((group) => ({
    supplierUserId: group.supplierUserId,
    supplierLabel: group.supplierLabel,
    lines: group.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceUsd: item.priceUsd,
      lineTotalUsd: item.priceUsd * item.quantity,
    })),
    itemCount: group.itemCount,
    subtotalUsd: group.subtotalUsd,
  }));
}
