"use client";

import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogVariantOption } from "@/lib/products/variants";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { parseVariantsJson } from "@/lib/products/variants";
import {
  GIFT_CARD_AMOUNT_GROUP_ID,
  GIFT_CARD_CUSTOM_MAX_USD,
  GIFT_CARD_CUSTOM_MIN_USD,
  GIFT_CARD_FROM_GROUP_ID,
  GIFT_CARD_FROM_MAX_LENGTH,
  GIFT_CARD_MESSAGE_GROUP_ID,
  GIFT_CARD_MESSAGE_MAX_LENGTH,
  GIFT_CARD_RECIPIENT_GROUP_ID,
  clampGiftCardCustomAmount,
  giftCardDeliveryFromModifiers,
  isGiftCardCustomVariant,
  normalizeGiftCardRecipientEmail,
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
  amountUsd: number;
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

function presetAmountUsd(option: CatalogVariantOption | undefined): number | null {
  if (!option) return null;
  const fromName = Number(option.name.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(fromName) && fromName > 0) return fromName;
  if (option.priceExtraUsd > 0) return option.priceExtraUsd;
  return null;
}

function textModifier(
  groupId: string,
  groupName: string,
  value: string,
): CartModifierSelection | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return {
    groupId,
    groupName,
    optionId: trimmed.slice(0, 80),
    optionName: trimmed,
    priceExtraUsd: 0,
  };
}

export function GiftCardAmountPicker({
  product,
  variantOptions,
  selectedVariantId,
  onSelectVariant,
  selectedModifiers,
  onModifiersChange,
  amountUsd,
}: GiftCardAmountPickerProps) {
  const customId = customVariantId(product, variantOptions);
  const presets = variantOptions.filter((option) => option.id !== customId);
  const isCustom = Boolean(customId && selectedVariantId === customId);
  const currentCustom =
    selectedModifiers.find((row) => row.groupId === GIFT_CARD_AMOUNT_GROUP_ID)
      ?.priceExtraUsd ?? 0;
  const selectedPreset = presets.find(
    (option) => option.id === selectedVariantId,
  );
  const customInputValue = isCustom
    ? currentCustom > 0
      ? String(currentCustom)
      : ""
    : String(presetAmountUsd(selectedPreset) ?? (amountUsd > 0 ? amountUsd : ""));
  const delivery = giftCardDeliveryFromModifiers(selectedModifiers);
  const emailError =
    delivery.recipientEmail.length > 0 &&
    normalizeGiftCardRecipientEmail(delivery.recipientEmail) == null;

  function withDelivery(
    amountMods: CartModifierSelection[],
  ): CartModifierSelection[] {
    return [
      ...amountMods,
      textModifier(
        GIFT_CARD_RECIPIENT_GROUP_ID,
        "Para",
        delivery.recipientEmail,
      ),
      textModifier(
        GIFT_CARD_MESSAGE_GROUP_ID,
        "Mensaje",
        delivery.message.slice(0, GIFT_CARD_MESSAGE_MAX_LENGTH),
      ),
      textModifier(
        GIFT_CARD_FROM_GROUP_ID,
        "De parte de",
        delivery.fromName.slice(0, GIFT_CARD_FROM_MAX_LENGTH),
      ),
    ].filter((row): row is CartModifierSelection => Boolean(row));
  }

  function selectPreset(option: CatalogVariantOption) {
    onSelectVariant(option.id);
    onModifiersChange(withDelivery([]));
  }

  function handleCustomAmount(raw: string) {
    if (!customId) return;
    const parsed = Number(raw.replace(",", "."));
    const matchingPreset = presets.find((option) => {
      const amount = presetAmountUsd(option);
      return amount != null && amount === parsed;
    });
    if (matchingPreset && raw.trim() !== "") {
      onSelectVariant(matchingPreset.id);
      onModifiersChange(withDelivery([]));
      return;
    }
    onSelectVariant(customId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onModifiersChange(withDelivery([]));
      return;
    }
    const clamped = clampGiftCardCustomAmount(parsed);
    const amount = clamped ?? parsed;
    onModifiersChange(
      withDelivery([
        {
          groupId: GIFT_CARD_AMOUNT_GROUP_ID,
          groupName: "Monto",
          optionId: String(amount),
          optionName: formatUsd(amount),
          priceExtraUsd: amount,
        },
      ]),
    );
  }

  function updateDelivery(next: {
    recipientEmail?: string;
    message?: string;
    fromName?: string;
  }) {
    const recipientEmail = next.recipientEmail ?? delivery.recipientEmail;
    const message = next.message ?? delivery.message;
    const fromName = next.fromName ?? delivery.fromName;
    const amountMods = selectedModifiers.filter(
      (row) => row.groupId === GIFT_CARD_AMOUNT_GROUP_ID,
    );
    onModifiersChange(
      [
        ...amountMods,
        textModifier(GIFT_CARD_RECIPIENT_GROUP_ID, "Para", recipientEmail),
        textModifier(
          GIFT_CARD_MESSAGE_GROUP_ID,
          "Mensaje",
          message.slice(0, GIFT_CARD_MESSAGE_MAX_LENGTH),
        ),
        textModifier(
          GIFT_CARD_FROM_GROUP_ID,
          "De parte de",
          fromName.slice(0, GIFT_CARD_FROM_MAX_LENGTH),
        ),
      ].filter((row): row is CartModifierSelection => Boolean(row)),
    );
  }

  return (
    <div className="gift-card-buy-box">
      <p className="gift-card-buy-box-price">{formatUsd(amountUsd)}</p>
      <p className="gift-card-buy-box-kicker">Tarjeta de regalo digital</p>

      <fieldset className="gift-card-buy-box-section">
        <legend>Elige un monto</legend>
        <div className="gift-card-amount-grid">
          {presets.map((option) => {
            const selected = !isCustom && option.id === selectedVariantId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectPreset(option)}
                className={cn(
                  "gift-card-amount-tile",
                  selected && "gift-card-amount-tile--selected",
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="gift-card-buy-box-field">
        <span>Otro monto</span>
        <span className="gift-card-custom-input">
          <span aria-hidden="true">$</span>
          <input
            type="number"
            min={GIFT_CARD_CUSTOM_MIN_USD}
            max={GIFT_CARD_CUSTOM_MAX_USD}
            step="0.01"
            inputMode="decimal"
            value={customInputValue}
            onChange={(event) => handleCustomAmount(event.target.value)}
            placeholder={`${GIFT_CARD_CUSTOM_MIN_USD}–${GIFT_CARD_CUSTOM_MAX_USD}`}
          />
        </span>
        <span className="gift-card-buy-box-hint">
          Entre {formatUsd(GIFT_CARD_CUSTOM_MIN_USD)} y{" "}
          {formatUsd(GIFT_CARD_CUSTOM_MAX_USD)}
        </span>
        {isCustom &&
        customInputValue &&
        clampGiftCardCustomAmount(Number(customInputValue)) == null ? (
          <span className="gift-card-buy-box-error">
            Indica un monto válido para continuar.
          </span>
        ) : null}
      </label>

      <fieldset className="gift-card-buy-box-section">
        <legend>Envío por correo electrónico</legend>
        <label className="gift-card-buy-box-field">
          <span>Correo del destinatario</span>
          <input
            type="email"
            autoComplete="email"
            value={delivery.recipientEmail}
            onChange={(event) =>
              updateDelivery({ recipientEmail: event.target.value })
            }
            placeholder="nombre@correo.com"
            required
          />
          {emailError ? (
            <span className="gift-card-buy-box-error">
              Ingresa un correo electrónico válido.
            </span>
          ) : (
            <span className="gift-card-buy-box-hint">
              El código único se enviará a este correo al confirmar el pago.
            </span>
          )}
        </label>
        <label className="gift-card-buy-box-field">
          <span>De parte de</span>
          <input
            type="text"
            maxLength={GIFT_CARD_FROM_MAX_LENGTH}
            autoComplete="name"
            value={delivery.fromName}
            onChange={(event) =>
              updateDelivery({ fromName: event.target.value })
            }
            placeholder="Tu nombre"
          />
        </label>
        <label className="gift-card-buy-box-field">
          <span>Mensaje (opcional)</span>
          <textarea
            rows={3}
            maxLength={GIFT_CARD_MESSAGE_MAX_LENGTH}
            value={delivery.message}
            onChange={(event) =>
              updateDelivery({ message: event.target.value })
            }
            placeholder="Escribe una dedicatoria breve"
          />
        </label>
      </fieldset>
    </div>
  );
}
