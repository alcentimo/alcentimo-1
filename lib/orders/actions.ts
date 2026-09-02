"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOrderCustomerDetails } from "@/lib/customers/get-customer-checkout-context";
import { getStoreBySlug } from "@/lib/stores";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import { buildTransactionalOrderWhatsAppMessage, buildOrderTotalBsLabel } from "@/lib/whatsapp-formatter";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { buildOrderSharePublicUrl } from "@/lib/orders/order-share";
import { getPublicStoreSettingsConfig } from "@/lib/store-settings/get-public-store-settings";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { fetchPublicPlatformSettings } from "@/lib/platform/get-platform-settings";
import { resolveShippingQuote } from "@/lib/store-settings/shipping-pricing";
import { getDisplayableUsdExchangeRate } from "@/lib/exchange-rate/get-tasa-cambio";
import {
  findDeliveryZone,
  findMeetingPointInZone,
  findPickupPoint,
  formatDeliverySelectionSummary,
  formatPickupSelectionSummary,
} from "@/lib/store-settings/delivery-zones";
import {
  getPaymentMethod,
  paymentMethodRequiresProof,
} from "@/src/config/payment-methods";
import { getShippingMethod, isNationalCarrierKey } from "@/src/config/shipping-methods";
import { getCarrierBranchById } from "@/lib/shipping/carrier-branches";
import type { PaymentMethodKey, ShippingCarrierKey } from "@/lib/store-settings/types";
import { uploadOrderPaymentProof } from "@/lib/orders/storage";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { reserveOrderInventory } from "@/lib/orders/order-inventory";
import { enrichOrderItemsWithStockUnits } from "@/lib/orders/stationery-inventory";
import { calculatePromotionDiscountUsd } from "@/lib/promotions/discount";
import { validateGiftCardCode } from "@/lib/gift-cards/actions";
import {
  applyGiftCardToWallet,
  getCustomerStoreCredit,
} from "@/lib/gift-cards/wallet-actions";
import { isPlatformAdminOwnedStore } from "@/lib/gift-cards/admin-store";
import { giftCardApplyAmount, normalizeGiftCardCode } from "@/lib/gift-cards/code";
import { GIFT_CARD_STORE_DENIED_MESSAGE } from "@/lib/gift-cards/types";
import type { SubmitOrderLineInput } from "@/lib/orders/types";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  getStoreOrders,
  type StoreOrdersResult,
} from "@/lib/orders/get-store-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/inventory/constants";
import { resolveOrderLinesWithPricing } from "@/lib/orders/resolve-order-line-prices";
import {
  consumeDropshipStockForOrderLines,
  restoreDropshipStockForOrderLines,
} from "@/lib/dropship/supplier-stock";
import { readDropshipHoldSessionKey } from "@/lib/dropship/cart-hold-session";
import { syncCustomerProfileFromCheckout } from "@/lib/customers/sync-customer-profile-from-checkout";
import { issuePurchasedGiftCards } from "@/lib/gift-cards/ensure-catalog-product";

export interface SubmitTransactionalOrderResult {
  error?: string;
  orderId?: string;
  whatsappUrl?: string;
  /** Teléfono normalizado guardado en el pedido / perfil. */
  customerPhone?: string;
  customerName?: string;
  issuedGiftCardCodes?: string[];
}


export async function submitTransactionalOrder(
  formData: FormData,
): Promise<SubmitTransactionalOrderResult> {
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const customerNameRaw = String(formData.get("customerName") ?? "").trim();
  const customerPhoneRaw = String(formData.get("customerPhone") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "[]");
  const proof = formData.get("paymentProof");
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "").trim();
  const shippingMethodRaw = String(formData.get("shippingMethod") ?? "").trim();
  const promotionCodeRaw = String(formData.get("promotionCode") ?? "").trim();
  const giftCardCodeRaw = normalizeGiftCardCode(
    String(formData.get("giftCardCode") ?? ""),
  );
  const skipStoreCredit =
    String(formData.get("skipStoreCredit") ?? "").trim() === "1";
  const locationIdRaw = String(formData.get("locationId") ?? "").trim();
  const fulfillmentTypeRaw = String(formData.get("fulfillmentType") ?? "").trim();
  const deliveryAddressRaw = String(formData.get("deliveryAddress") ?? "").trim();
  const deliveryZoneIdRaw = String(formData.get("deliveryZoneId") ?? "").trim();
  const meetingPointIdRaw = String(formData.get("meetingPointId") ?? "").trim();
  const pickupPointIdRaw = String(formData.get("pickupPointId") ?? "").trim();
  const fulfillmentNotesRaw = String(formData.get("fulfillmentNotes") ?? "").trim();
  const shippingBranchCodeRaw = String(
    formData.get("shippingBranchCode") ?? "",
  ).trim();
  const shippingBranchNameRaw = String(
    formData.get("shippingBranchName") ?? "",
  ).trim();
  const shippingBranchAddressRaw = String(
    formData.get("shippingBranchAddress") ?? "",
  ).trim();

  const resolvedShippingBranch = shippingBranchCodeRaw
    ? getCarrierBranchById(shippingBranchCodeRaw)
    : null;

  const fulfillmentType =
    fulfillmentTypeRaw === "pickup" ||
    fulfillmentTypeRaw === "delivery" ||
    fulfillmentTypeRaw === "shipping"
      ? fulfillmentTypeRaw
      : shippingMethodRaw === "pickup"
        ? "pickup"
        : shippingMethodRaw === "delivery"
          ? "delivery"
          : isNationalCarrierKey(shippingMethodRaw)
            ? "shipping"
            : null;

  if (!storeSlug) {
    return { error: "Tienda no válida." };
  }

  let lines: SubmitOrderLineInput[];
  try {
    const parsed = JSON.parse(itemsRaw) as SubmitOrderLineInput[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: "El carrito está vacío." };
    }
    lines = parsed.map((line) => ({
      productId: String(line.productId ?? "").trim(),
      variantId: String(line.variantId ?? "").trim(),
      productName: String(line.productName ?? "Producto").trim(),
      variantName: String(line.variantName ?? "Estándar").trim(),
      quantity: Math.max(0, Math.floor(Number(line.quantity ?? 0))),
      unitPriceUsd: Number(line.unitPriceUsd ?? 0),
      wholesaleApplied: Boolean(line.wholesaleApplied),
      modifiersExtraUsd: Math.max(
        0,
        Math.min(1000, Number(line.modifiersExtraUsd ?? 0) || 0),
      ),
      giftRecipientEmail:
        String(line.giftRecipientEmail ?? "").trim().slice(0, 254) || undefined,
      giftFromName:
        String(line.giftFromName ?? "").trim().slice(0, 80) || undefined,
      giftMessage:
        String(line.giftMessage ?? "").trim().slice(0, 500) || undefined,
    }));
  } catch {
    return { error: "Pedido inválido." };
  }

  for (const line of lines) {
    if (!line.productId) {
      return {
        error:
          "Un producto del carrito ya no está disponible. Actualiza el carrito e intenta de nuevo.",
      };
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return {
        error: `La cantidad de "${line.productName}" no es válida.`,
      };
    }
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { error: "Tienda no encontrada." };
  }

  const customerResult = await resolveOrderCustomerDetails(store.id, {
    customerName: customerNameRaw,
    customerPhone: customerPhoneRaw,
  });
  if (!customerResult.ok) {
    return { error: customerResult.error };
  }

  const { customerUserId, customerName, customerPhone } = customerResult;
  const normalizedPhone = normalizeWhatsAppPhone(customerPhone);
  if (!normalizedPhone) {
    return { error: "Indica un teléfono válido (mínimo 10 dígitos)." };
  }

  const hasProofFile = proof instanceof File && proof.size > 0;
  // El comprobante es siempre opcional: el pedido puede confirmarse por WhatsApp sin adjunto.

  const trimmedDeliveryAddress = deliveryAddressRaw.slice(0, 320);
  const trimmedFulfillmentNotes = fulfillmentNotesRaw.slice(0, 200);

  // Sucursal de agencia nacional: opcional (se puede acordar después por WhatsApp).

  const [settings, platformSettings] = await Promise.all([
    getPublicStoreSettingsConfig(store.id),
    fetchPublicPlatformSettings(),
  ]);
  const purchaseInfo = buildPublicPurchaseInfo(
    settings,
    platformSettings.dropshipShipping,
  );

  let resolvedFulfillmentAddress: string | null = null;
  const deliveryZonesWithPoints = purchaseInfo.deliveryZones.filter(
    (zone) => zone.meetingPoints.length > 0,
  );

  if (fulfillmentType === "delivery") {
    if (deliveryZonesWithPoints.length > 0) {
      const zone = findDeliveryZone(deliveryZonesWithPoints, deliveryZoneIdRaw);
      const point = findMeetingPointInZone(zone, meetingPointIdRaw);
      if (!zone || !point) {
        return { error: "Selecciona la zona y el punto de encuentro." };
      }
      resolvedFulfillmentAddress = formatDeliverySelectionSummary({
        zoneName: zone.name,
        meetingPointLabel: point.label,
        meetingPointReference: point.reference,
        notes: trimmedFulfillmentNotes || trimmedDeliveryAddress || null,
      });
    } else if (trimmedDeliveryAddress.length > 0) {
      resolvedFulfillmentAddress = trimmedDeliveryAddress;
    }
  }

  if (fulfillmentType === "pickup" && purchaseInfo.pickupPoints.length > 0) {
    const point = findPickupPoint(purchaseInfo.pickupPoints, pickupPointIdRaw);
    if (!point) {
      return { error: "Selecciona el punto de retiro." };
    }
    resolvedFulfillmentAddress = formatPickupSelectionSummary({
      meetingPointLabel: point.label,
      meetingPointReference: point.reference,
      notes: trimmedFulfillmentNotes,
    });
  }

  const shippingBranchCode =
    resolvedShippingBranch?.id ??
    (shippingBranchCodeRaw.slice(0, 120) || null);
  const shippingBranchName =
    resolvedShippingBranch?.name ??
    (shippingBranchNameRaw.slice(0, 160) || null);
  const shippingBranchAddress = resolvedShippingBranch
    ? `${resolvedShippingBranch.address}, ${resolvedShippingBranch.city}, ${resolvedShippingBranch.state}`
    : shippingBranchAddressRaw.slice(0, 320) || null;

  const admin = createAdminClient();
  const pricedLines = await resolveOrderLinesWithPricing(admin, store.id, lines);
  if (pricedLines.error) {
    return { error: pricedLines.error };
  }
  const orderItems = pricedLines.items;
  const enrichedOrderItems = await enrichOrderItemsWithStockUnits(
    admin,
    store.id,
    orderItems,
  );
  const subtotalUsd = enrichedOrderItems.reduce(
    (sum, item) => sum + item.line_total_usd,
    0,
  );

  if (subtotalUsd <= 0) {
    return { error: "El total del pedido no es válido." };
  }

  let discountUsd = 0;
  let promotionLabel: string | undefined;

  if (promotionCodeRaw) {
    if (!customerUserId) {
      return {
        error: "Debes registrarte como cliente de la tienda para usar promociones.",
      };
    }

    const { data: promotionValidation, error: promotionError } = await admin.rpc(
      "validate_customer_promotion" as never,
      {
        p_store_slug: storeSlug,
        p_code: promotionCodeRaw,
        p_user_id: customerUserId,
      } as never,
    );

    if (promotionError) {
      return { error: promotionError.message };
    }

    const validation = promotionValidation as {
      error?: string;
      success?: boolean;
      code?: string;
      name?: string;
      discount_percentage?: number;
    } | null;

    if (!validation || validation.error || !validation.discount_percentage) {
      return { error: validation?.error ?? "Promoción no válida." };
    }

    discountUsd = calculatePromotionDiscountUsd(
      subtotalUsd,
      Number(validation.discount_percentage),
    );
    promotionLabel = validation.name ?? validation.code;
  }

  const totalUsd = Math.max(0, subtotalUsd - discountUsd);

  const merchandiseUsd = totalUsd;
  const giftOnlyOrder =
    enrichedOrderItems.length > 0 &&
    enrichedOrderItems.every((item) => item.is_gift_card);
  const hasPurchasedGiftCard = enrichedOrderItems.some(
    (item) => item.is_gift_card,
  );

  if (
    purchaseInfo.checkoutType === "direct_whatsapp" &&
    !hasPurchasedGiftCard
  ) {
    return {
      error:
        "Esta tienda recibe pedidos solo por WhatsApp. Usa «Pedir por WhatsApp» en el carrito.",
    };
  }

  const shippingQuote = giftOnlyOrder
    ? {
        chargeUsd: 0,
        chargeLabel: "Producto digital",
        summaryLabel: "Tarjeta de regalo · sin envío",
        isFree: true,
        isCod: false,
        appliesPaidShipping: false,
        freeShipping: {
          enabled: false,
          always: false,
          minUsd: 0,
          unlocked: false,
          remainingUsd: 0,
        },
      }
    : resolveShippingQuote({
        pricing: purchaseInfo.shippingPricing,
        method: shippingMethodRaw,
        merchandiseUsd,
      });
  const orderTotalUsd = merchandiseUsd + shippingQuote.chargeUsd;

  let giftCardUsd = 0;
  let storeCreditUsd = 0;
  const adminStore = await isPlatformAdminOwnedStore(store.id, store.owner_id);

  if (giftCardCodeRaw) {
    if (!adminStore) {
      return { error: GIFT_CARD_STORE_DENIED_MESSAGE };
    }
    if (customerUserId) {
      const walletResult = await applyGiftCardToWallet(storeSlug, giftCardCodeRaw);
      if (walletResult.error) {
        return { error: walletResult.error };
      }
    } else {
      const giftValidation = await validateGiftCardCode(
        storeSlug,
        giftCardCodeRaw,
      );
      if (giftValidation.error || !giftValidation.code) {
        return {
          error: giftValidation.error ?? "Tarjeta de regalo no válida.",
        };
      }
      giftCardUsd = giftCardApplyAmount(
        giftValidation.currentBalanceUsd ?? 0,
        orderTotalUsd,
      );
      if (giftCardUsd <= 0) {
        return { error: "Esta tarjeta de regalo no tiene saldo." };
      }
    }
  }

  if (customerUserId && adminStore && !skipStoreCredit) {
    const credit = await getCustomerStoreCredit(storeSlug);
    if (credit.error) {
      return { error: credit.error };
    }
    storeCreditUsd = giftCardApplyAmount(
      credit.balanceUsd ?? 0,
      Math.max(0, orderTotalUsd - giftCardUsd),
    );
  }

  const amountDueUsd = Math.max(0, orderTotalUsd - giftCardUsd - storeCreditUsd);

  const orderId = crypto.randomUUID();

  let paymentProofUrl: string | null = null;
  if (hasProofFile && proof instanceof File) {
    const proofUpload = await uploadOrderPaymentProof(store.id, orderId, proof);
    if (proofUpload.error || !proofUpload.url) {
      return { error: proofUpload.error ?? "No se pudo subir el comprobante." };
    }
    paymentProofUrl = proofUpload.url;
  }

  let resolvedLocationId: string | null = null;
  let resolvedLocationName: string | null = null;
  let resolvedLocationAddress: string | null = null;
  if (locationIdRaw) {
    const { data: locationRow } = await admin
      .from("store_locations")
      .select("id, name, address")
      .eq("id", locationIdRaw)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();
    resolvedLocationId = (locationRow?.id as string | undefined) ?? null;
    resolvedLocationName = (locationRow?.name as string | undefined) ?? null;
    resolvedLocationAddress = (locationRow?.address as string | undefined) ?? null;
  }

  if (!resolvedLocationId) {
    const { data: defaultLocation } = await admin
      .from("store_locations")
      .select("id, name, address")
      .eq("store_id", store.id)
      .eq("is_default", true)
      .maybeSingle();
    resolvedLocationId = (defaultLocation?.id as string | undefined) ?? null;
    resolvedLocationName = (defaultLocation?.name as string | undefined) ?? null;
    resolvedLocationAddress = (defaultLocation?.address as string | undefined) ?? null;
  }

  if (customerUserId) {
    let preferredShippingBranchCode: string | null | undefined;
    let preferredShippingBranchName: string | null | undefined;
    let preferredShippingBranchAddress: string | null | undefined;

    if (!giftOnlyOrder) {
      if (isNationalCarrierKey(shippingMethodRaw) && shippingBranchCode) {
        preferredShippingBranchCode = shippingBranchCode;
        preferredShippingBranchName = shippingBranchName;
        preferredShippingBranchAddress = shippingBranchAddress;
      } else if (
        shippingMethodRaw === "delivery" ||
        shippingMethodRaw === "pickup"
      ) {
        preferredShippingBranchCode = null;
        preferredShippingBranchName = null;
        preferredShippingBranchAddress = null;
      }
    }

    // Guarda teléfono/nombre del paso Datos → perfil + Mis Clientes + autofill.
    await syncCustomerProfileFromCheckout({
      storeId: store.id,
      userId: customerUserId,
      displayName: customerName,
      phone: customerPhone,
      ...(!giftOnlyOrder && resolvedFulfillmentAddress
        ? { deliveryAddress: resolvedFulfillmentAddress }
        : {}),
      ...(!giftOnlyOrder && shippingMethodRaw
        ? { preferredShippingMethod: shippingMethodRaw }
        : {}),
      preferredShippingBranchCode: giftOnlyOrder
        ? undefined
        : preferredShippingBranchCode,
      preferredShippingBranchName: giftOnlyOrder
        ? undefined
        : preferredShippingBranchName,
      preferredShippingBranchAddress: giftOnlyOrder
        ? undefined
        : preferredShippingBranchAddress,
    });
  }

  const expectsPaymentProof =
    amountDueUsd > 0 && paymentMethodRequiresProof(paymentMethodRaw);
  const initialEstado =
    expectsPaymentProof && !paymentProofUrl ? "por_pagar" : "pendiente";
  // null = falta comprobante; "" = método sin comprobante (efectivo, etc.).
  const storedProofUrl =
    paymentProofUrl ?? (expectsPaymentProof ? null : "");

  const orderInsert = {
    id: orderId,
    store_id: store.id,
    customer_user_id: customerUserId,
    customer_name: customerName,
    customer_phone: customerPhone,
    items: enrichedOrderItems,
    total_usd: amountDueUsd,
    payment_proof_url: storedProofUrl,
    estado: initialEstado,
    location_id: giftOnlyOrder ? null : resolvedLocationId,
    fulfillment_type: giftOnlyOrder ? null : fulfillmentType,
    gift_card_code: giftCardUsd > 0 ? giftCardCodeRaw : null,
    gift_card_usd: giftCardUsd > 0 ? giftCardUsd : null,
    store_credit_usd: storeCreditUsd > 0 ? storeCreditUsd : null,
    shipping_method: giftOnlyOrder ? null : shippingMethodRaw || null,
    shipping_branch_code:
      giftOnlyOrder || !isNationalCarrierKey(shippingMethodRaw)
        ? null
        : shippingBranchCode,
    shipping_branch_name:
      giftOnlyOrder || !isNationalCarrierKey(shippingMethodRaw)
        ? null
        : shippingBranchName,
    shipping_branch_address:
      giftOnlyOrder || !isNationalCarrierKey(shippingMethodRaw)
        ? null
        : shippingBranchAddress,
    delivery_address: giftOnlyOrder ? null : resolvedFulfillmentAddress,
  };

  let { error: insertError } = await admin.from("orders").insert(orderInsert);

  // Si la BD aún no admite por_pagar, reintenta como pendiente (mismo significado
  // para el cliente vía payment_proof_url === null).
  if (
    insertError &&
    initialEstado === "por_pagar" &&
    (insertError.code === "23514" ||
      /orders_estado_check|por_pagar/i.test(insertError.message))
  ) {
    ({ error: insertError } = await admin.from("orders").insert({
      ...orderInsert,
      estado: "pendiente",
    }));
  }

  if (insertError) {
    return { error: insertError.message };
  }

  // Aparta el stock del Hub (reserva). El descuento físico ocurre al confirmar el pago.
  const sessionKey = await readDropshipHoldSessionKey();
  const dropshipStock = await consumeDropshipStockForOrderLines(
    admin,
    store.id,
    enrichedOrderItems,
    {
      orderId,
      customerUserId,
      sessionKey,
    },
  );
  if (dropshipStock.error) {
    await admin.from("orders").delete().eq("id", orderId);
    return { error: dropshipStock.error };
  }

  const reserveResult = await reserveOrderInventory(admin, orderId);
  if (reserveResult.error) {
    if (dropshipStock.consumed.length > 0) {
      await restoreDropshipStockForOrderLines(
        admin,
        enrichedOrderItems,
        orderId,
      );
    }
    await admin.from("orders").delete().eq("id", orderId);
    return { error: reserveResult.error };
  }

  if (promotionCodeRaw && customerUserId) {
    const { data: redeemResult, error: redeemError } = await admin.rpc(
      "redeem_customer_promotion" as never,
      {
        p_store_slug: storeSlug,
        p_code: promotionCodeRaw,
        p_user_id: customerUserId,
      } as never,
    );

    if (redeemError) {
      if (dropshipStock.consumed.length > 0) {
        await restoreDropshipStockForOrderLines(
          admin,
          enrichedOrderItems,
          orderId,
        );
      }
      await admin.from("orders").delete().eq("id", orderId);
      return { error: redeemError.message };
    }

    const redeemed = redeemResult as { error?: string; success?: boolean } | null;
    if (redeemed?.error) {
      if (dropshipStock.consumed.length > 0) {
        await restoreDropshipStockForOrderLines(
          admin,
          enrichedOrderItems,
          orderId,
        );
      }
      await admin.from("orders").delete().eq("id", orderId);
      return { error: redeemed.error };
    }
  }

  if (giftCardUsd > 0) {
    const { data: giftRedeem, error: giftRedeemError } = await admin.rpc(
      "redeem_gift_card_for_order" as never,
      {
        p_code: giftCardCodeRaw,
        p_store_id: store.id,
        p_order_id: orderId,
        p_amount: giftCardUsd,
      } as never,
    );

    const failGift = async (message: string) => {
      if (dropshipStock.consumed.length > 0) {
        await restoreDropshipStockForOrderLines(
          admin,
          enrichedOrderItems,
          orderId,
        );
      }
      await admin.from("orders").delete().eq("id", orderId);
      return { error: message };
    };

    if (giftRedeemError) {
      return failGift(giftRedeemError.message);
    }

    const redeemedGift = giftRedeem as {
      error?: string;
      success?: boolean;
    } | null;
    if (!redeemedGift || redeemedGift.error || !redeemedGift.success) {
      return failGift(
        redeemedGift?.error ?? "No se pudo canjear la tarjeta de regalo.",
      );
    }
  }

  if (storeCreditUsd > 0 && customerUserId) {
    const { data: creditRedeem, error: creditRedeemError } = await admin.rpc(
      "apply_store_credit_for_order" as never,
      {
        p_store_id: store.id,
        p_user_id: customerUserId,
        p_order_id: orderId,
        p_amount: storeCreditUsd,
      } as never,
    );

    const failCredit = async (message: string) => {
      if (dropshipStock.consumed.length > 0) {
        await restoreDropshipStockForOrderLines(
          admin,
          enrichedOrderItems,
          orderId,
        );
      }
      await admin.from("orders").delete().eq("id", orderId);
      return { error: message };
    };

    if (creditRedeemError) {
      return failCredit(creditRedeemError.message);
    }

    const redeemedCredit = creditRedeem as {
      error?: string;
      success?: boolean;
    } | null;
    if (!redeemedCredit || redeemedCredit.error || !redeemedCredit.success) {
      return failCredit(
        redeemedCredit?.error ?? "No se pudo aplicar el saldo a favor.",
      );
    }
  }

  const issuedGift = await issuePurchasedGiftCards({
    storeId: store.id,
    orderId,
    items: enrichedOrderItems,
  });
  const issuedGiftCardCodes = issuedGift.codes;
  const itemsForMessage = issuedGift.items;
  if (
    enrichedOrderItems.some((item) => item.is_gift_card) &&
    issuedGiftCardCodes.length === 0
  ) {
    await admin.from("orders").delete().eq("id", orderId);
    return { error: "No se pudo generar el código de la tarjeta de regalo." };
  }

  const paymentLabel =
    amountDueUsd <= 0
      ? storeCreditUsd > 0
        ? "Saldo a favor"
        : "Tarjeta de regalo"
      : paymentMethodRaw
        ? getPaymentMethod(paymentMethodRaw as PaymentMethodKey).label
        : undefined;
  const carrierLabel = shippingMethodRaw
    ? getShippingMethod(shippingMethodRaw as ShippingCarrierKey).label
    : undefined;
  const shippingMethodLabel = giftOnlyOrder
    ? "Producto digital"
    : carrierLabel ??
    (fulfillmentType === "pickup"
      ? purchaseInfo.pickupPoints.length > 0
        ? "Punto de encuentro"
        : "Retiro"
      : fulfillmentType === "delivery"
        ? purchaseInfo.deliveryZones.some((zone) => zone.meetingPoints.length > 0)
          ? "Entrega personalizada"
          : "Envío a domicilio"
        : fulfillmentType === "shipping"
          ? "Encomienda nacional"
          : undefined);
  const shippingModalityLabel =
    shippingQuote.chargeLabel && shippingQuote.chargeLabel !== "—"
      ? shippingQuote.chargeLabel
      : undefined;

  let totalBsLabel: string | undefined;
  try {
    const rateRow = await getDisplayableUsdExchangeRate(admin);
    totalBsLabel = buildOrderTotalBsLabel(amountDueUsd, rateRow?.rate);
  } catch {
    totalBsLabel = undefined;
  }

  const message = buildTransactionalOrderWhatsAppMessage({
    customerName,
    customerPhone,
    items: itemsForMessage.map((item) => ({
      product_name: item.product_name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      line_total_usd: item.line_total_usd,
      pricing_tier: item.pricing_tier,
    })),
    totalUsd: amountDueUsd,
    totalBsLabel,
    orderRef: orderId,
    orderShareUrl: buildOrderSharePublicUrl(store.slug, orderId, {
      customDomain: store.custom_domain,
      customDomainVerified: Boolean(store.custom_domain_verified),
    }),
    paymentLabel,
    shippingLabel: shippingMethodLabel,
    shippingChargeLabel: giftOnlyOrder ? undefined : shippingModalityLabel,
    discountUsd: discountUsd > 0 ? discountUsd : undefined,
    promotionLabel,
    giftCardUsd: giftCardUsd > 0 ? giftCardUsd : undefined,
    giftCardCode: giftCardUsd > 0 ? giftCardCodeRaw : undefined,
    storeCreditUsd: storeCreditUsd > 0 ? storeCreditUsd : undefined,
    issuedGiftCardCodes:
      issuedGiftCardCodes.length > 0 ? issuedGiftCardCodes : undefined,
    locationName: giftOnlyOrder ? undefined : resolvedLocationName ?? undefined,
    locationAddress: giftOnlyOrder
      ? undefined
      : resolvedLocationAddress ?? undefined,
    deliveryAddress: giftOnlyOrder
      ? undefined
      : resolvedFulfillmentAddress ?? undefined,
    shippingBranchName:
      giftOnlyOrder || !isNationalCarrierKey(shippingMethodRaw)
        ? undefined
        : shippingBranchName ?? undefined,
    shippingBranchAddress:
      giftOnlyOrder || !isNationalCarrierKey(shippingMethodRaw)
        ? undefined
        : shippingBranchAddress ?? undefined,
  });

  const storeWhatsAppPhone =
    purchaseInfo.whatsappPhone?.trim() ||
    purchaseInfo.whatsappPhones.find((phone) => phone.trim())?.trim() ||
    "";

  const whatsappUrl =
    buildWhatsAppOrderUrl(storeWhatsAppPhone, message) ?? undefined;

  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}/perfil`);
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/liquidacion");
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard/analiticas");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath(`/pedidos/${orderId}`);
  revalidatePublicCatalogCache({ slug: storeSlug, storeId: store.id });

  return {
    orderId,
    whatsappUrl,
    customerPhone,
    customerName,
    issuedGiftCardCodes:
      issuedGiftCardCodes.length > 0 ? issuedGiftCardCodes : undefined,
  };
}

/**
 * Adjunta un comprobante a un pedido sin pago (éxito de checkout o Mis compras).
 * Si estaba en por_pagar, pasa a pendiente (en verificación).
 */
export async function attachOrderPaymentProof(input: {
  storeSlug: string;
  orderId: string;
  proof: File;
}): Promise<
  | { ok: true; paymentProofUrl: string; estado: "pendiente" }
  | { ok: false; error: string }
> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  const orderId = input.orderId.trim();
  const proof = input.proof;

  if (!storeSlug || !orderId) {
    return { ok: false, error: "Pedido inválido." };
  }

  if (!(proof instanceof File) || proof.size <= 0) {
    return { ok: false, error: "Selecciona una imagen del comprobante." };
  }

  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { ok: false, error: "Tienda no encontrada." };
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, store_id, payment_proof_url, estado")
    .eq("id", orderId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (orderError) {
    return { ok: false, error: orderError.message };
  }
  if (!order) {
    return { ok: false, error: "No encontramos ese pedido." };
  }

  if (order.payment_proof_url) {
    return {
      ok: false,
      error: "Este pedido ya tiene un comprobante adjunto.",
    };
  }

  const canAttach =
    order.estado === "por_pagar" || order.estado === "pendiente";
  if (!canAttach) {
    return {
      ok: false,
      error: "Este pedido ya no admite comprobante desde aquí.",
    };
  }

  // Autorización: UUID del pedido (secreto en éxito / Mis compras).

  const proofUpload = await uploadOrderPaymentProof(store.id, orderId, proof);
  if (proofUpload.error || !proofUpload.url) {
    return {
      ok: false,
      error: proofUpload.error ?? "No se pudo subir el comprobante.",
    };
  }

  const { data: updated, error: updateError } = await admin
    .from("orders")
    .update({
      payment_proof_url: proofUpload.url,
      estado: "pendiente",
    })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .is("payment_proof_url", null)
    .in("estado", ["por_pagar", "pendiente"])
    .select("id, estado")
    .maybeSingle();

  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  if (!updated) {
    return {
      ok: false,
      error: "Este pedido ya tiene un comprobante o ya no admite adjuntos.",
    };
  }

  revalidatePath(`/c/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}/cuenta`);
  revalidatePath(`/c/${storeSlug}/cuenta/${orderId}`);
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard/liquidacion");
  revalidatePath("/dashboard");
  revalidatePath(`/pedidos/${orderId}`);

  return {
    ok: true,
    paymentProofUrl: proofUpload.url,
    estado: "pendiente",
  };
}

export async function fetchStoreOrdersPage(options: {
  offset: number;
  limit?: number;
  locationId?: string | null;
}): Promise<StoreOrdersResult & { error?: string }> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return {
      orders: [],
      totalCount: 0,
      hasMore: false,
      error: auth.error,
    };
  }

  try {
    return await getStoreOrders(auth.store.id, {
      offset: options.offset,
      limit: options.limit ?? ORDERS_PAGE_SIZE,
      locationId: options.locationId,
    });
  } catch (error) {
    return {
      orders: [],
      totalCount: 0,
      hasMore: false,
      error:
        error instanceof Error ? error.message : "No se pudieron cargar pedidos.",
    };
  }
}
