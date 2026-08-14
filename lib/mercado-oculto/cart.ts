/** Carrito del mercado oculto (persistencia en sessionStorage). */

export const MERCADO_CART_STORAGE_KEY = "alcentimo-mercado-oculto-cart-v1";

export interface MercadoCartItem {
  productId: string;
  productName: string;
  priceUsd: number;
  quantity: number;
  thumbUrl: string | null;
  supplierLabel: string;
  availableStock: number;
}

export function sanitizeMercadoCartItems(raw: unknown): MercadoCartItem[] {
  if (!Array.isArray(raw)) return [];

  const items: MercadoCartItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<MercadoCartItem>;
    const productId =
      typeof row.productId === "string" ? row.productId.trim() : "";
    const productName =
      typeof row.productName === "string" ? row.productName.trim() : "";
    const quantity = Math.floor(Number(row.quantity));
    const priceUsd = Number(row.priceUsd);
    const availableStock = Math.max(0, Math.floor(Number(row.availableStock) || 0));

    if (!productId || !productName || quantity <= 0 || !Number.isFinite(priceUsd)) {
      continue;
    }

    items.push({
      productId,
      productName,
      priceUsd,
      quantity: availableStock > 0 ? Math.min(quantity, availableStock) : quantity,
      thumbUrl:
        typeof row.thumbUrl === "string" && row.thumbUrl.trim()
          ? row.thumbUrl.trim()
          : null,
      supplierLabel:
        typeof row.supplierLabel === "string" && row.supplierLabel.trim()
          ? row.supplierLabel.trim()
          : "Mayorista Oficial Alcéntimo",
      availableStock,
    });
  }
  return items;
}

export function readMercadoCart(): MercadoCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(MERCADO_CART_STORAGE_KEY);
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
}

export function clearMercadoCart(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MERCADO_CART_STORAGE_KEY);
}

export function mercadoCartItemCount(items: MercadoCartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function mercadoCartSubtotal(items: MercadoCartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceUsd * item.quantity, 0);
}
