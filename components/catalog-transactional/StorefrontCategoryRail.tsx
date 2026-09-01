"use client";

import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BookOpen,
  Car,
  Cpu,
  HeartPulse,
  Home,
  LayoutGrid,
  Package,
  Shirt,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
  Watch,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CatalogCategoryOption } from "@/lib/catalog/extract-categories";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronica: Cpu,
  celulares: Smartphone,
  tecnologia: Cpu,
  hogar: Home,
  belleza: Sparkles,
  accesorios: Watch,
  alimentos: UtensilsCrossed,
  ropa: Shirt,
  salud: HeartPulse,
  juguetes: Baby,
  papeleria: BookOpen,
  automotriz: Car,
  autopartes: Car,
  otros: Package,
};

function iconForCategory(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug.trim().toLowerCase()] ?? Package;
}

interface StorefrontCategoryRailProps {
  categories: CatalogCategoryOption[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

/**
 * Carrusel de categorías estilo marketplace (icono + etiqueta, scroll horizontal).
 */
export function StorefrontCategoryRail({
  categories,
  activeCategoryId,
  onSelectCategory,
}: StorefrontCategoryRailProps) {
  if (categories.length === 0) return null;

  return (
    <section
      id="storefront-categorias"
      className="storefront-cat-rail"
      aria-labelledby="storefront-cat-rail-title"
    >
      <div className="storefront-cat-rail-head">
        <h2 id="storefront-cat-rail-title">Categorías</h2>
      </div>
      <ul className="storefront-cat-rail-track">
        <li>
          <button
            type="button"
            className={cn(
              "storefront-cat-card",
              activeCategoryId == null && "is-active",
            )}
            onClick={() => onSelectCategory(null)}
          >
            <span className="storefront-cat-card-icon" aria-hidden="true">
              <LayoutGrid className="h-5 w-5" />
            </span>
            <span className="storefront-cat-card-label">Todas</span>
          </button>
        </li>
        {categories.map((category) => {
          const Icon = iconForCategory(category.slug);
          return (
            <li key={category.slug}>
              <button
                type="button"
                className={cn(
                  "storefront-cat-card",
                  activeCategoryId === category.slug && "is-active",
                )}
                onClick={() => onSelectCategory(category.slug)}
              >
                <span className="storefront-cat-card-icon" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="storefront-cat-card-label">{category.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
