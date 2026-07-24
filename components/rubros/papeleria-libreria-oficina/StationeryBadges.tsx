"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import { getStationeryBadgesFromMetadata } from "@/lib/rubros/modules/papeleria-libreria-oficina";
import { cn } from "@/lib/cn";

interface StationeryBadgesProps {
  product: CatalogListItem;
}

export function StationeryBadges({ product }: StationeryBadgesProps) {
  const badges = useMemo(
    () => getStationeryBadgesFromMetadata(product.metadata ?? null),
    [product.metadata],
  );

  if (badges.length === 0) return null;

  return (
    <ul className="stationery-badges" aria-label="Atributos del producto">
      {badges.map((badge) => (
        <li
          key={`${badge.kind}-${badge.label}`}
          className={cn(
            "stationery-badge",
            badge.kind === "presentation" && "stationery-badge--presentation",
            badge.kind === "segment" && "stationery-badge--segment",
            badge.kind === "format" && "stationery-badge--format",
            badge.kind === "units" && "stationery-badge--units",
          )}
        >
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
