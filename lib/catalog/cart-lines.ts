import type { CartItem } from "@/lib/catalog/cart-types";
import { cartItemKey, sumModifiersExtraUsd } from "@/lib/catalog/cart-types";
import { parseVariantsJson } from "@/lib/products/variants";
import type { SubmitOrderLineInput } from "@/lib/orders/types";
import {
  isGiftCardDeliveryGroupId,
  parseGiftCardDeliveryFromModifiers,
  validateGiftCardDelivery,
} from "@/lib/gift-cards/delivery";
import { isGiftCardCatalogItem } from "@/lib/gift-cards/catalog";

/** Normaliza IDs que vienen del carrito / localStorage (string, número o nulo). */
function asCartId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function resolveCartProductId(item: CartItem): string {
  const product = item.product as
    | (CartItem["product"] & { id?: string })
    | null
    | undefined;
  return asCartId(
    product?.product_id ?? product?.id ?? (item as { productId?: unknown }).productId,
  );
}

/**
 * Resuelve la variante del catálogo si existe.
 * Puede quedar vacío: el servidor la mapea al UUID de inventario por producto.
 */
function resolveCartVariantId(item: CartItem): string {
  const fromItem = asCartId(item.variantId);
  if (fromItem) return fromItem;

  const fromDefault = asCartId(item.product?.default_variant_id);
  if (fromDefault) return fromDefault;

  const variants = parseVariantsJson(item.product?.product_variants);
  return asCartId(variants[0]?.id);
}

/**
 * Convierte ítems del carrito en líneas de pedido.
 * Criterio de validez (alineado con el servidor): productId + cantidad > 0.
 * No exige variantId ni precio: el backend resuelve inventario y valida precios.
 */
export function buildSubmitOrderLinesFromCartItems(
  items: CartItem[],
): SubmitOrderLineInput[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items
    .map((item) => {
      const productId = resolveCartProductId(item);
      const variantId = resolveCartVariantId(item);
      const quantityRaw = Number(item?.quantity);
      const quantity = Number.isFinite(quantityRaw)
        ? Math.max(1, Math.floor(quantityRaw))
        : 0;
      const unitPriceRaw = Number(item?.unitPriceUsd);
      const unitPriceUsd = Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0;
      const modifiersExtraUsd = Math.max(
        0,
        Number(
          sumModifiersExtraUsd(
            item.modifiers?.filter(
              (row) => !isGiftCardDeliveryGroupId(row.groupId),
            ),
          ),
        ) || 0,
      );

      const delivery = isGiftCardCatalogItem(item.product)
        ? validateGiftCardDelivery(
            parseGiftCardDeliveryFromModifiers(item.modifiers),
          )
        : null;

      return {
        productId,
        variantId,
        productName:
          String(item.product?.product_name ?? "").trim() || "Producto",
        variantName: String(item.variantName ?? "").trim() || "Estándar",
        quantity,
        unitPriceUsd,
        wholesaleApplied: Boolean(item.wholesaleApplied),
        modifiersExtraUsd,
        ...(delivery?.ok
          ? {
              giftRecipientEmail: delivery.delivery.recipientEmail || undefined,
              giftFromName: delivery.delivery.fromName || undefined,
              giftMessage: delivery.delivery.message || undefined,
            }
          : {}),
      };
    })
    .filter((line) => line.productId.length > 0 && line.quantity > 0);
}

export interface CartLineInput {
  productId: string;
  variantId: string;
  quantity: number;
  modifiers?: import("@/lib/catalog/cart-types").CartModifierSelection[];
}

export function cartItemsToLines(items: CartItem[]): CartLineInput[] {
  return items
    .map((item) => ({
      productId: asCartId(item.product?.product_id),
      variantId: asCartId(item.variantId),
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      modifiers: item.modifiers?.length ? item.modifiers : undefined,
    }))
    .filter((line) => line.productId.length > 0 && line.quantity > 0);
}

export function mergeCartLines(
  base: CartLineInput[],
  incoming: CartLineInput[],
): CartLineInput[] {
  const map = new Map<string, CartLineInput>();

  for (const line of base) {
    if (line.quantity <= 0) continue;
    const key = cartItemKey(line.productId, line.variantId, line.modifiers);
    map.set(key, { ...line });
  }

  for (const line of incoming) {
    if (line.quantity <= 0) continue;
    const key = cartItemKey(line.productId, line.variantId, line.modifiers);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + line.quantity,
      });
    } else {
      map.set(key, { ...line });
    }
  }

  return Array.from(map.values());
}

function cartItemLineKey(item: CartItem): string {
  return cartItemKey(
    item.product.product_id,
    item.variantId,
    item.modifiers,
  );
}

/**
 * Fusiona un carrito remoto con cambios locales concurrentes.
 * Las líneas solo-locales se conservan; en colisión se toma la mayor cantidad.
 */
export function mergeCartItemsPreferLocal(
  remote: CartItem[],
  local: CartItem[],
): CartItem[] {
  const map = new Map<string, CartItem>();

  for (const item of remote) {
    if (item.quantity <= 0) continue;
    map.set(cartItemLineKey(item), item);
  }

  for (const item of local) {
    if (item.quantity <= 0) continue;
    const key = cartItemLineKey(item);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...item,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

/**
 * Colapsa líneas con la misma clave product:variant:modifiers sumando cantidades.
 * Evita subtotales inflados por filas duplicadas en el estado.
 */
export function dedupeCartItems(items: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();

  for (const item of items) {
    if (item.quantity <= 0) continue;
    const key = cartItemLineKey(item);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
    } else {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}
