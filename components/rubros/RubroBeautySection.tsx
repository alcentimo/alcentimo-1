"use client";

import dynamic from "next/dynamic";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const BeautyAttributesEditor = dynamic(
  () =>
    import("@/components/rubros/salud-belleza/BeautyAttributesEditor").then(
      (mod) => mod.BeautyAttributesEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroBeautySectionProps {
  rubro: StoreRubro | string;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

/** Atributos de belleza (lazy). */
export function RubroBeautySection({
  rubro,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: RubroBeautySectionProps) {
  if (getActiveProductModuleId(rubro) !== "salud-belleza") return null;

  return (
    <BeautyAttributesEditor
      values={values}
      onChange={onChange}
      disabled={disabled}
      variant={variant}
    />
  );
}
