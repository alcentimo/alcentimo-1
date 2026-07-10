import { CreditCard, Package, Truck } from "lucide-react";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";

interface PurchaseInfoPanelProps {
  purchaseInfo: PublicPurchaseInfo;
}

function FieldList({ fields }: { fields: Record<string, string> }) {
  const entries = Object.entries(fields).filter(([, value]) => value.trim());

  if (entries.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1 text-xs text-zinc-500">
      {entries.map(([key, value]) => (
        <li key={key} className="truncate">
          {value}
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
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Truck className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              Envío
            </div>
            <ul className="mt-3 space-y-3">
              {purchaseInfo.shipping.map((option) => (
                <li
                  key={option.key}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3"
                >
                  <p className="text-sm font-medium text-zinc-800">{option.label}</p>
                  {option.details && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {option.details}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasPayments && (
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CreditCard className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              Pagos
            </div>
            <ul className="mt-3 space-y-3">
              {purchaseInfo.payments.map((option) => (
                <li
                  key={option.key}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3"
                >
                  <p className="text-sm font-medium text-zinc-800">{option.label}</p>
                  <FieldList fields={option.fields} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasInstallments && purchaseInfo.installments && (
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Package className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              Venta a cuotas
            </div>
            <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
              <p>
                Desde {purchaseInfo.installments.minUsd} USD · hasta{" "}
                {purchaseInfo.installments.maxInstallments} cuotas
              </p>
              {purchaseInfo.installments.conditions.trim() && (
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {purchaseInfo.installments.conditions}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
