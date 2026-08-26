import { formatUsd } from "@/lib/format";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { SupplierOrder } from "@/lib/supplier/order-types";
import type {
  SupplierB2bPaymentMethodKey,
  SupplierPaymentConfig,
} from "@/lib/supplier/payment-types";
import { SUPPLIER_ORDER_PAYMENT_STATUS_LABELS } from "@/lib/supplier/payment-types";

export function buildSupplierPaymentWhatsAppMessage(options: {
  merchantStoreName: string;
  order: Pick<
    SupplierOrder,
    | "id"
    | "totalUsd"
    | "items"
    | "paymentMethod"
    | "paymentReference"
    | "paymentStatus"
  >;
  paymentMethodLabel?: string | null;
}): string {
  const code = options.order.id.slice(0, 8).toUpperCase();
  const methodLabel =
    options.paymentMethodLabel?.trim() ||
    (options.order.paymentMethod
      ? getPaymentMethod(options.order.paymentMethod as never)?.label
      : null) ||
    options.order.paymentMethod ||
    "Pago mayorista";

  const productLines = options.order.items.map(
    (item) =>
      `• ${item.quantity}x ${item.productTitle} — ${formatUsd(item.lineTotalUsd)}`,
  );

  const lines = [
    `Alcéntimo te compró estos productos. Apártalos y márcalos listos para recolección.`,
    "",
    `📦 Pedido mayorista #${code}`,
    `Estado de liquidación: ${SUPPLIER_ORDER_PAYMENT_STATUS_LABELS[options.order.paymentStatus]}`,
    `Método: ${methodLabel}`,
    options.order.paymentReference?.trim()
      ? `Referencia: ${options.order.paymentReference.trim()}`
      : null,
    `Costo mayorista: ${formatUsd(options.order.totalUsd)}`,
    "",
    "🛒 Productos a apartar:",
    ...productLines,
    "",
    "Alcéntimo te pagará la liquidación. No cobres al cliente final.",
  ];

  return lines.filter((line): line is string => line != null).join("\n");
}

export function buildSupplierPaymentWhatsAppUrl(options: {
  supplierWhatsAppPhone: string;
  message: string;
}): string | null {
  return buildWhatsAppOrderUrl(options.supplierWhatsAppPhone, options.message);
}

export function describeSupplierPaymentMethods(
  config: SupplierPaymentConfig,
): Array<{
  key: SupplierB2bPaymentMethodKey;
  label: string;
  fields: Record<string, string>;
}> {
  const result: Array<{
    key: SupplierB2bPaymentMethodKey;
    label: string;
    fields: Record<string, string>;
  }> = [];

  for (const [key, method] of Object.entries(config.methods) as Array<
    [SupplierB2bPaymentMethodKey, SupplierPaymentConfig["methods"][SupplierB2bPaymentMethodKey]]
  >) {
    if (!method.enabled) continue;
    const meta = getPaymentMethod(key);
    result.push({
      key,
      label: meta?.label ?? key,
      fields: method.fields,
    });
  }

  return result;
}
