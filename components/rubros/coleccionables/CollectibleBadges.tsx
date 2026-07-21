"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import { getCollectibleBadgesFromMetadata } from "@/lib/rubros/modules/coleccionables";
import { cn } from "@/lib/cn";

interface CollectibleBadgesProps {
  product: CatalogListItem;
}

export function CollectibleBadges({ product }: CollectibleBadgesProps) {
  const badges = useMemo(
    () => getCollectibleBadgesFromMetadata(product.metadata ?? null),
    [product.metadata],
  );

  if (badges.length === 0) return null;

  return (
    <ul className="collectible-badges" aria-label="Atributos del coleccionable">
      {badges.map((badge) => (
        <li
          key={`${badge.kind}-${badge.label}`}
          className={cn(
            "collectible-badge",
            badge.kind === "preorder" && "collectible-badge--preorder",
            badge.kind === "edition" && "collectible-badge--edition",
          )}
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
