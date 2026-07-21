"use client";

import { useMemo } from "react";
import type { CatalogListItem } from "@/lib/database.types";
import { getTechSpecChipsFromMetadata } from "@/lib/rubros/modules/tecnologia";

interface TechSpecsChipsProps {
  product: CatalogListItem;
}

export function TechSpecsChips({ product }: TechSpecsChipsProps) {
  const chips = useMemo(
    () =>
      getTechSpecChipsFromMetadata(
        product.metadata ?? null,
        product.category_slug,
      ),
    [product.metadata, product.category_slug],
  );

  if (chips.length === 0) return null;

  return (
    <ul className="tech-spec-chips" aria-label="Especificaciones">
      {chips.map((chip) => (
        <li key={`${chip.label}-${chip.value}`} className="tech-spec-chip">
          <span className="tech-spec-chip-label">{chip.label}</span>
          <span className="tech-spec-chip-value">{chip.value}</span>
        </li>
      ))}
    </ul>
  );
}
