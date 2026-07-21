"use client";

import dynamic from "next/dynamic";
import type { FoodModifiersConfig } from "@/lib/rubros/modules/alimentos";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const FoodModifiersEditor = dynamic(
  () =>
    import("@/components/rubros/alimentos/FoodModifiersEditor").then(
      (mod) => mod.FoodModifiersEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroModifiersSectionProps {
  rubro: StoreRubro | string;
  value: FoodModifiersConfig;
  onChange: (value: FoodModifiersConfig) => void;
  disabled?: boolean;
}

/** Editor de modificadores (solo Alimentos). Lazy. */
export function RubroModifiersSection({
  rubro,
  value,
  onChange,
  disabled = false,
}: RubroModifiersSectionProps) {
  if (getActiveProductModuleId(rubro) !== "alimentos") return null;

  return (
    <FoodModifiersEditor
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
