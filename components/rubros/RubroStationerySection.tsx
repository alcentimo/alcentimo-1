"use client";

import dynamic from "next/dynamic";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const StationeryAttributesEditor = dynamic(
  () =>
    import(
      "@/components/rubros/papeleria-libreria-oficina/StationeryAttributesEditor"
    ).then((mod) => mod.StationeryAttributesEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroStationerySectionProps {
  rubro: StoreRubro | string;
  categorySlug: string;
  categoryLabel?: string | null;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

/** Atributos de papelería y oficina (lazy). */
export function RubroStationerySection({
  rubro,
  categorySlug,
  categoryLabel,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: RubroStationerySectionProps) {
  if (getActiveProductModuleId(rubro) !== "papeleria-libreria-oficina") {
    return null;
  }

  return (
    <StationeryAttributesEditor
      categorySlug={categorySlug}
      categoryLabel={categoryLabel}
      values={values}
      onChange={onChange}
      disabled={disabled}
      variant={variant}
    />
  );
}
