import { PaymentMethodCard } from "@/components/payments/PaymentMethodCard";
import { ShippingMethodCard } from "@/components/shipping/ShippingMethodCard";
import { BrandLogoTile } from "@/components/ui/BrandLogoTile";
import { getPaymentMethod } from "@/src/config/payment-methods";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { PaymentMethodKey } from "@/lib/store-settings/types";

interface PurchaseInfoPanelProps {
  purchaseInfo: PublicPurchaseInfo;
}

const PURCHASE_INFO_LOGO_CLASS = "h-9 w-9 shrink-0";
const PURCHASE_INFO_CARD_CLASS = "purchase-info-method-card";

function PaymentFieldSummary({
  methodKey,
  fields,
}: {
  methodKey: PaymentMethodKey;
  fields: Record<string, string>;
}) {
  const meta = getPaymentMethod(methodKey);
  const visibleFields = meta.fields.filter(
    (field) =>
      field.type !== "qr-image" &&
      field.key !== "qrImageUrl" &&
      fields[field.key]?.trim(),
  );

  if (visibleFields.length === 0) return null;

  return (
    <ul className="purchase-info-field-list">
      {visibleFields.map((field) => (
        <li key={field.key}>
          <span className="text-zinc-400">{field.label}: </span>
          <span className="font-medium text-zinc-600">{fields[field.key]}</span>
        </li>
      ))}
    </ul>
  );
}

export function PurchaseInfoPanel({ purchaseInfo }: PurchaseInfoPanelProps) {
  const hasShipping = purchaseInfo.shipping.length > 0;
  const hasPayments = purchaseInfo.payments.length > 0;
  const hasInstallments = purchaseInfo.installments != null;

  if (!hasShipping && !hasPayments && !hasInstallments) {
    return (
      <aside className="purchase-info-panel">
        <h2 className="purchase-info-title">Información de compra</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          El comercio aún no ha publicado métodos de envío o pago. Consulta directamente
          con la tienda.
        </p>
      </aside>
    );
  }

  return (
    <aside className="purchase-info-panel">
      <h2 className="purchase-info-title">Información de compra</h2>
      <p className="purchase-info-subtitle">
        Métodos disponibles configurados por la tienda.
      </p>

      <div className="mt-6 space-y-6">
        {hasShipping && (
          <section>
            <h3 className="purchase-info-section-title">Envío</h3>
            <ul className="purchase-info-method-list">
              {purchaseInfo.shipping.map((option) => (
                <li key={option.key}>
                  <ShippingMethodCard
                    carrierKey={option.key}
                    details={option.details}
                    description={option.description}
                    estimatedTime={option.estimatedTime}
                    className={PURCHASE_INFO_CARD_CLASS}
                    logoClassName={PURCHASE_INFO_LOGO_CLASS}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasPayments && (
          <section>
            <h3 className="purchase-info-section-title">Pagos</h3>
            <ul className="purchase-info-method-list">
              {purchaseInfo.payments.map((option) => {
                const meta = getPaymentMethod(option.key);
                const hasFieldSummary = meta.fields.some(
                  (field) =>
                    field.type !== "qr-image" &&
                    field.key !== "qrImageUrl" &&
                    option.fields[field.key]?.trim(),
                );

                return (
                  <li key={option.key} className="purchase-info-payment-item">
                    <PaymentMethodCard
                      methodKey={option.key}
                      className={`${PURCHASE_INFO_CARD_CLASS}${hasFieldSummary ? " purchase-info-method-card-attached" : ""}`}
                      logoClassName={PURCHASE_INFO_LOGO_CLASS}
                    />
                    <PaymentFieldSummary
                      methodKey={option.key}
                      fields={option.fields}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {hasInstallments && purchaseInfo.installments && (
          <section>
            <h3 className="purchase-info-section-title">Venta a cuotas</h3>
            <article className={`${PURCHASE_INFO_CARD_CLASS} shipping-method-card`}>
              <BrandLogoTile
                className={PURCHASE_INFO_LOGO_CLASS}
                backgroundClassName="bg-violet-600"
              >
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">
                  Cuotas
                </span>
              </BrandLogoTile>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">Venta a cuotas</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  Desde {purchaseInfo.installments.minUsd} USD · hasta{" "}
                  {purchaseInfo.installments.maxInstallments} cuotas
                </p>
                {purchaseInfo.installments.conditions.trim() && (
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                    {purchaseInfo.installments.conditions}
                  </p>
                )}
              </div>
            </article>
          </section>
        )}
      </div>
    </aside>
  );
}
