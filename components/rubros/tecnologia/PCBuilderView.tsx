"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Check,
  Cpu,
  MessageCircle,
  Monitor,
  HardDrive,
  Zap,
  Box,
  CircuitBoard,
  MemoryStick,
} from "lucide-react";
import type { CatalogListItem, ExchangeRate, Store } from "@/lib/database.types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import type { CatalogCurrencySettings } from "@/lib/store-settings/types";
import {
  PC_BUILDER_SLOT_ORDER,
  calculatePCBuilderTotalUsd,
  countPCBuilderSelections,
  getPCBuilderSlotDefinition,
  indexProductsByPCBuilderSlot,
  isPCBuilderComplete,
  resolvePCBuilderProductPriceUsd,
  type PCBuilderSelection,
  type PCBuilderSlotId,
} from "@/lib/rubros/modules/tecnologia/pc-builder";
import { buildPCBuilderWhatsAppMessage } from "@/lib/catalog/pc-builder-whatsapp-message";
import { buildWhatsAppOrderUrl } from "@/lib/catalog/whatsapp-order";
import { getTechSpecChipsFromMetadata } from "@/lib/rubros/modules/tecnologia/specs";
import { formatApproxBs, formatUsd } from "@/lib/format";
import { getStoreCatalogBasePath } from "@/lib/store-host";
import { cn } from "@/lib/cn";

const SLOT_ICONS: Record<PCBuilderSlotId, LucideIcon> = {
  cpu: Cpu,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  storage: HardDrive,
  gpu: Monitor,
  psu: Zap,
  case: Box,
};

interface PCBuilderViewProps {
  store: Store;
  products: CatalogListItem[];
  exchangeRate: ExchangeRate | null;
  purchaseInfo: PublicPurchaseInfo;
  catalogCurrency: CatalogCurrencySettings;
}

export function PCBuilderView({
  store,
  products,
  exchangeRate,
  purchaseInfo,
  catalogCurrency,
}: PCBuilderViewProps) {
  const [activeSlotId, setActiveSlotId] =
    useState<PCBuilderSlotId>("cpu");
  const [selection, setSelection] = useState<PCBuilderSelection>({});

  const productsBySlot = useMemo(
    () => indexProductsByPCBuilderSlot(products),
    [products],
  );
  const activeSlot = getPCBuilderSlotDefinition(activeSlotId);
  const activeProducts = productsBySlot[activeSlotId];
  const totalUsd = calculatePCBuilderTotalUsd(selection);
  const selectedCount = countPCBuilderSelections(selection);
  const complete = isPCBuilderComplete(selection);
  const liveRate = exchangeRate?.rate ?? null;
  const totalVes =
    liveRate != null && catalogCurrency.showBsConversion
      ? totalUsd * liveRate
      : null;
  const catalogBase = getStoreCatalogBasePath(store.slug);

  function selectProduct(slotId: PCBuilderSlotId, product: CatalogListItem) {
    setSelection((current) => ({ ...current, [slotId]: product }));
  }

  function clearSlot(slotId: PCBuilderSlotId) {
    setSelection((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
  }

  function handleWhatsAppQuote() {
    if (selectedCount === 0) return;

    const message = buildPCBuilderWhatsAppMessage({
      storeName: store.name,
      selection,
    });
    const url = buildWhatsAppOrderUrl(purchaseInfo.whatsappPhone, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="pc-builder txn-catalog txn-catalog--tech txn-catalog--pc-builder">
      <header className="pc-builder-header">
        <Link href={catalogBase} className="pc-builder-back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al catálogo
        </Link>
        <div className="pc-builder-header-copy">
          <p className="txn-catalog-eyebrow">PC Builder</p>
          <h1 className="pc-builder-title">Arma tu PC</h1>
          <p className="pc-builder-subtitle">
            Elige cada componente paso a paso. El precio se actualiza al instante
            y puedes enviar la cotización por WhatsApp.
          </p>
        </div>
      </header>

      <div className="pc-builder-layout">
        <aside className="pc-builder-steps" aria-label="Pasos del armado">
          {PC_BUILDER_SLOT_ORDER.map((slotId, index) => {
            const slot = getPCBuilderSlotDefinition(slotId);
            const Icon = SLOT_ICONS[slotId];
            const selected = selection[slotId];
            const isActive = activeSlotId === slotId;
            const availableCount = productsBySlot[slotId].length;

            return (
              <button
                key={slotId}
                type="button"
                onClick={() => setActiveSlotId(slotId)}
                className={cn(
                  "pc-builder-step",
                  isActive && "pc-builder-step-active",
                  selected && "pc-builder-step-done",
                )}
              >
                <span className="pc-builder-step-index">{index + 1}</span>
                <span className="pc-builder-step-icon" aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="pc-builder-step-copy">
                  <span className="pc-builder-step-label">{slot.label}</span>
                  <span className="pc-builder-step-meta">
                    {selected
                      ? selected.product_name
                      : availableCount > 0
                        ? `${availableCount} opciones`
                        : "Sin productos en tienda"}
                  </span>
                </span>
                {selected ? (
                  <Check className="pc-builder-step-check h-4 w-4" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </aside>

        <section className="pc-builder-picker" aria-labelledby="pc-builder-picker-title">
          <div className="pc-builder-picker-header">
            <div>
              <h2 id="pc-builder-picker-title" className="pc-builder-picker-title">
                {activeSlot.label}
              </h2>
              <p className="pc-builder-picker-desc">{activeSlot.description}</p>
            </div>
            {selection[activeSlotId] ? (
              <button
                type="button"
                className="pc-builder-clear-slot"
                onClick={() => clearSlot(activeSlotId)}
              >
                Quitar selección
              </button>
            ) : null}
          </div>

          {activeProducts.length === 0 ? (
            <div className="pc-builder-empty">
              <p className="text-sm font-medium text-zinc-800">
                No hay productos en esta categoría
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">
                Publica componentes con categorías como{" "}
                {activeSlot.categorySlugs.slice(0, 2).join(" o ")} para que
                aparezcan aquí.
              </p>
            </div>
          ) : (
            <div className="pc-builder-product-grid">
              {activeProducts.map((product) => {
                const selected = selection[activeSlotId]?.product_id === product.product_id;
                const priceUsd = resolvePCBuilderProductPriceUsd(product);
                const chips = getTechSpecChipsFromMetadata(
                  product.metadata ?? null,
                  product.category_slug,
                ).slice(0, 3);

                return (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => selectProduct(activeSlotId, product)}
                    className={cn(
                      "pc-builder-product-card",
                      selected && "pc-builder-product-card-selected",
                    )}
                    aria-pressed={selected}
                  >
                    <div className="pc-builder-product-card-head">
                      <p className="pc-builder-product-name">{product.product_name}</p>
                      {product.brand ? (
                        <p className="pc-builder-product-brand">{product.brand}</p>
                      ) : null}
                    </div>
                    {chips.length > 0 ? (
                      <ul className="pc-builder-product-specs">
                        {chips.map((chip) => (
                          <li key={chip.label}>
                            {chip.label}: {chip.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="pc-builder-product-price">{formatUsd(priceUsd)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="pc-builder-summary" aria-label="Resumen del armado">
          <div className="pc-builder-summary-card">
            <h2 className="pc-builder-summary-title">Tu configuración</h2>
            <p className="pc-builder-summary-progress">
              {selectedCount}/{PC_BUILDER_SLOT_ORDER.length} componentes
            </p>

            <ul className="pc-builder-summary-list">
              {PC_BUILDER_SLOT_ORDER.map((slotId) => {
                const slot = getPCBuilderSlotDefinition(slotId);
                const product = selection[slotId];
                return (
                  <li key={slotId}>
                    <span className="pc-builder-summary-slot">{slot.shortLabel}</span>
                    <span className="pc-builder-summary-value">
                      {product ? (
                        <>
                          <span>{product.product_name}</span>
                          <strong>{formatUsd(resolvePCBuilderProductPriceUsd(product))}</strong>
                        </>
                      ) : (
                        <span className="pc-builder-summary-empty">Pendiente</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="pc-builder-summary-total">
              <p>Total estimado</p>
              <p className="pc-builder-summary-total-usd">{formatUsd(totalUsd)}</p>
              {totalVes != null ? (
                <p className="pc-builder-summary-total-ves">
                  {formatApproxBs(totalVes)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="pc-builder-whatsapp-btn"
              disabled={selectedCount === 0 || !purchaseInfo.whatsappPhone.trim()}
              onClick={handleWhatsAppQuote}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {complete
                ? "Enviar cotización por WhatsApp"
                : "Solicitar cotización por WhatsApp"}
            </button>

            {!purchaseInfo.whatsappPhone.trim() ? (
              <p className="pc-builder-summary-hint">
                La tienda aún no configuró un WhatsApp de contacto.
              </p>
            ) : (
              <p className="pc-builder-summary-hint">
                {complete
                  ? "Recibirás un mensaje con el desglose completo para confirmar ensamblaje y pago."
                  : "Puedes enviar la cotización aunque falten componentes por elegir."}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
