"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import {
  hasFoodModifiers,
  parseFoodModifiersFromMetadata,
  type FoodModifierOption,
} from "@/lib/rubros/modules/alimentos";
import type { CartModifierSelection } from "@/lib/catalog/cart-types";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface FoodModifiersPickerProps {
  product: CatalogListItem;
  selected: CartModifierSelection[];
  onChange: (next: CartModifierSelection[]) => void;
}

export function FoodModifiersPicker({
  product,
  selected,
  onChange,
}: FoodModifiersPickerProps) {
  const config = useMemo(
    () => parseFoodModifiersFromMetadata(product.metadata ?? null),
    [product.metadata],
  );

  if (!hasFoodModifiers(config)) return null;

  function isSelected(groupId: string, optionId: string) {
    return selected.some(
      (row) => row.groupId === groupId && row.optionId === optionId,
    );
  }

  function toggle(
    groupId: string,
    groupName: string,
    option: FoodModifierOption,
    max: number,
  ) {
    const already = isSelected(groupId, option.id);
    if (already) {
      onChange(
        selected.filter(
          (row) => !(row.groupId === groupId && row.optionId === option.id),
        ),
      );
      return;
    }

    const groupSelected = selected.filter((row) => row.groupId === groupId);
    let next = selected;
    if (max <= 1) {
      next = selected.filter((row) => row.groupId !== groupId);
    } else if (groupSelected.length >= max) {
      return;
    }

    onChange([
      ...next,
      {
        groupId,
        groupName,
        optionId: option.id,
        optionName: option.name,
        priceExtraUsd: option.priceExtraUsd,
      },
    ]);
  }

  return (
    <div className="food-modifiers-picker space-y-2.5">
      {config.groups.map((group) => (
        <div key={group.id}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--pc-fg-meta)]">
            {group.name}
            {group.required ? " *" : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.options.map((option) => {
              const active = isSelected(group.id, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    toggle(group.id, group.name, option, group.max)
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                    active
                      ? "border-amber-800 bg-amber-800 text-white"
                      : "border-[var(--pc-border)] bg-[var(--pc-surface)] text-[var(--pc-fg)]",
                  )}
                >
                  {option.name}
                  {option.priceExtraUsd > 0
                    ? ` · +${formatUsd(option.priceExtraUsd)}`
                    : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
