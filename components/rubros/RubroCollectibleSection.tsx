"use client";

import dynamic from "next/dynamic";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const CollectibleAttributesEditor = dynamic(
  () =>
    import("@/components/rubros/coleccionables/CollectibleAttributesEditor").then(
      (mod) => mod.CollectibleAttributesEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroCollectibleSectionProps {
  rubro: StoreRubro | string;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

/** Atributos de coleccionable (lazy). */
export function RubroCollectibleSection({
  rubro,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: RubroCollectibleSectionProps) {
  if (getActiveProductModuleId(rubro) !== "coleccionables") return null;

  return (
    <CollectibleAttributesEditor
      values={values}
      onChange={onChange}
      disabled={disabled}
      variant={variant}
    />
  );
}
