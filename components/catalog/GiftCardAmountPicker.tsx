"use client";

import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  GIFT_CARD_AMOUNT_GROUP_ID,
  GIFT_CARD_CUSTOM_MAX_USD,
  GIFT_CARD_CUSTOM_MIN_USD,
  clampGiftCardCustomAmount,
  isGiftCardCustomVariant,
} from "@/lib/gift-cards/catalog";
import {
  GIFT_CARD_FROM_MAX,
  GIFT_CARD_MESSAGE_MAX,
  mergeGiftCardDeliveryModifiers,
  parseGiftCardDeliveryFromModifiers,
  stripGiftCardDeliveryModifiers,
  type GiftCardDelivery,
} from "@/lib/gift-cards/delivery";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface GiftCardAmountPickerProps {
  product: CatalogListItem;
  variantOptions: CatalogVariantOption[];
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  selectedModifiers: CartModifierSelection[];
  onModifiersChange: (next: CartModifierSelection[]) => void;
}

function customVariantId(
  product: CatalogListItem,
  variantOptions: CatalogVariantOption[],
): string | null {
  const parsed = parseVariantsJson(product.product_variants);
  const fromJson = parsed.find((variant) =>
    isGiftCardCustomVariant(variant.attributes),
  );
  if (fromJson) return fromJson.id;
  const byName = variantOptions.find((option) =>
    /otro monto/i.test(option.name),
  );
  return byName?.id ?? null;
}

function currentDelivery(
  modifiers: CartModifierSelection[],
): GiftCardDelivery {
  const parsed = parseGiftCardDeliveryFromModifiers(modifiers);
  return {
    recipientEmail: parsed.recipientEmail ?? "",
    fromName: parsed.fromName ?? "",
    message: parsed.message ?? "",
  };
}

export function GiftCardAmountPicker({
  product,
  variantOptions,
  selectedVariantId,
  onSelectVariant,
  selectedModifiers,
  onModifiersChange,
}: GiftCardAmountPickerProps) {
  const customId = customVariantId(product, variantOptions);
  const presets = variantOptions.filter((option) => option.id !== customId);
  const isCustom = Boolean(customId && selectedVariantId === customId);
  const currentCustom =
    selectedModifiers.find((row) => row.groupId === GIFT_CARD_AMOUNT_GROUP_ID)
      ?.priceExtraUsd ?? 0;
  const customInputValue =
    currentCustom > 0 ? String(currentCustom) : "";
  const delivery = currentDelivery(selectedModifiers);

  function emit(amountMods: CartModifierSelection[], nextDelivery: GiftCardDelivery) {
    onModifiersChange(mergeGiftCardDeliveryModifiers(amountMods, nextDelivery));
  }

  function amountMods(): CartModifierSelection[] {
    return stripGiftCardDeliveryModifiers(selectedModifiers);
  }

  function selectPreset(option: CatalogVariantOption) {
    onSelectVariant(option.id);
    emit([], delivery);
  }

  function selectCustom() {
    if (!customId) return;
    onSelectVariant(customId);
  }

  function handleCustomAmount(raw: string) {
    if (!customId) return;
    onSelectVariant(customId);
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      emit([], delivery);
      return;
    }
    const clamped = clampGiftCardCustomAmount(parsed);
    const amount = clamped ?? parsed;
    emit(
      [
        {
          groupId: GIFT_CARD_AMOUNT_GROUP_ID,
          groupName: "Monto",
          optionId: String(amount),
          optionName: formatUsd(amount),
          priceExtraUsd: amount,
        },
      ],
      delivery,
    );
  }

  function updateDelivery(patch: Partial<GiftCardDelivery>) {
    emit(amountMods(), { ...delivery, ...patch });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Elige el monto
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Producto digital: al confirmar el pedido se genera un código y se
          envía por correo al destinatario.
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((option) => {
            const selected = !isCustom && option.id === selectedVariantId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectPreset(option)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums transition",
                  selected
                    ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-100"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
                )}
              >
                {option.name}
              </button>
            );
          })}
          {customId ? (
            <button
              type="button"
              onClick={selectCustom}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                isCustom
                  ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-100"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
              )}
            >
              Otro monto
            </button>
          ) : null}
        </div>
        {isCustom ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">
              Monto personalizado ({formatUsd(GIFT_CARD_CUSTOM_MIN_USD)}–
              {formatUsd(GIFT_CARD_CUSTOM_MAX_USD)})
            </span>
            <input
              type="number"
              min={GIFT_CARD_CUSTOM_MIN_USD}
              max={GIFT_CARD_CUSTOM_MAX_USD}
              step="0.01"
              inputMode="decimal"
              value={customInputValue}
              onChange={(event) => handleCustomAmount(event.target.value)}
              placeholder="Ej. 75"
              className="input-field w-full"
            />
            {customInputValue &&
            clampGiftCardCustomAmount(Number(customInputValue)) == null ? (
              <span className="text-xs text-red-600">
                El monto debe estar entre {formatUsd(GIFT_CARD_CUSTOM_MIN_USD)} y{" "}
                {formatUsd(GIFT_CARD_CUSTOM_MAX_USD)}.
              </span>
            ) : null}
          </label>
        ) : null}
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-800 dark:bg-teal-950/30">
        <legend className="px-1 text-sm font-semibold text-teal-950 dark:text-teal-50">
          Envío digital
        </legend>
        <p className="text-xs text-teal-800/90 dark:text-teal-200/80">
          Completa estos datos antes de añadir al carrito. El código se enviará
          al correo del destinatario junto con tu mensaje.
        </p>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
            Correo del destinatario
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={delivery.recipientEmail}
            onChange={(event) =>
              updateDelivery({ recipientEmail: event.target.value })
            }
            placeholder="destino@correo.com"
            className="input-field w-full"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
            De parte de
          </span>
          <input
            type="text"
            required
            maxLength={GIFT_CARD_FROM_MAX}
            autoComplete="name"
            value={delivery.fromName}
            onChange={(event) => updateDelivery({ fromName: event.target.value })}
            placeholder="Tu nombre"
            className="input-field w-full"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
            Mensaje / dedicatoria
          </span>
          <textarea
            required
            rows={3}
            maxLength={GIFT_CARD_MESSAGE_MAX}
            value={delivery.message}
            onChange={(event) => updateDelivery({ message: event.target.value })}
            placeholder="¡Felicidades! Disfruta tu regalo."
            className="input-field w-full min-h-[5.5rem] resize-y"
          />
        </label>
      </fieldset>
    </div>
  );
}
