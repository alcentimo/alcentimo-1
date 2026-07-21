"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import { getBeautyBadgesFromMetadata } from "@/lib/rubros/modules/salud-belleza";
import { cn } from "@/lib/cn";

interface BeautyBadgesProps {
  product: CatalogListItem;
}

export function BeautyBadges({ product }: BeautyBadgesProps) {
  const badges = useMemo(
    () => getBeautyBadgesFromMetadata(product.metadata ?? null),
    [product.metadata],
  );

  if (badges.length === 0) return null;

  return (
    <ul className="beauty-badges" aria-label="Atributos de belleza">
      {badges.map((badge) => (
        <li
          key={`${badge.kind}-${badge.label}`}
          className={cn(
            "beauty-badge",
            badge.kind === "skin" && "beauty-badge--skin",
            badge.kind === "ingredients" && "beauty-badge--ingredients",
          )}
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
