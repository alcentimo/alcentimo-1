"use client";

import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  GIFT_CARD_AMOUNT_GROUP_ID,
  GIFT_CARD_CUSTOM_MAX_USD,
  GIFT_CARD_CUSTOM_MIN_USD,
  GIFT_CARD_DEDICATION_MAX_LEN,
  clampGiftCardCustomAmount,
  giftCardDedicationModifier,
  getGiftCardDedication,
  isGiftCardCustomVariant,
  pricingModifiersWithoutDedication,
} from "@/lib/gift-cards/catalog";
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
  const dedication = getGiftCardDedication(selectedModifiers);

  function emitModifiers(
    amountMods: CartModifierSelection[],
    nextDedication = dedication,
  ) {
    const dedicationMod = giftCardDedicationModifier(nextDedication);
    onModifiersChange(
      dedicationMod ? [...amountMods, dedicationMod] : amountMods,
    );
  }

  function selectPreset(option: CatalogVariantOption) {
    onSelectVariant(option.id);
    emitModifiers([]);
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
      emitModifiers([]);
      return;
    }
    const clamped = clampGiftCardCustomAmount(parsed);
    const amount = clamped ?? parsed;
    emitModifiers([
      {
        groupId: GIFT_CARD_AMOUNT_GROUP_ID,
        groupName: "Monto",
        optionId: String(amount),
        optionName: formatUsd(amount),
        priceExtraUsd: amount,
      },
    ]);
  }

  function handleDedication(raw: string) {
    const amountMods = pricingModifiersWithoutDedication(selectedModifiers);
    emitModifiers(amountMods, raw);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
        Elige el monto
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Producto digital: al confirmar el pedido se genera un código para
        abonar en tu perfil o regalar.
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
      <label className="block space-y-1">
        <span className="text-xs text-zinc-500">
          Dedicatoria o mensaje (opcional)
        </span>
        <textarea
          value={dedication}
          maxLength={GIFT_CARD_DEDICATION_MAX_LEN}
          rows={3}
          onChange={(event) => handleDedication(event.target.value)}
          placeholder="Si es un regalo, puedes escribir un mensaje. Si es para ti, déjalo vacío."
          className="input-field w-full min-h-[4.5rem] resize-y"
        />
        <span className="block text-[11px] text-zinc-400">
          No es obligatorio. Sirve si quieres acompañar el código con una nota.
        </span>
      </label>
    </div>
  );
}
