"use client";

import dynamic from "next/dynamic";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const TechSpecsEditor = dynamic(
  () =>
    import("@/components/rubros/tecnologia/TechSpecsEditor").then(
      (mod) => mod.TechSpecsEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroTechSpecsSectionProps {
  rubro: StoreRubro | string;
  categorySlug: string;
  categoryLabel?: string | null;
  values: ProductExtraFieldsMap;
  onChange: (values: ProductExtraFieldsMap) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

/** Specs técnicas lazy (solo Tecnología). */
export function RubroTechSpecsSection({
  rubro,
  categorySlug,
  categoryLabel = null,
  values,
  onChange,
  disabled = false,
  variant = "default",
}: RubroTechSpecsSectionProps) {
  if (getActiveProductModuleId(rubro) !== "tecnologia") return null;

  return (
    <TechSpecsEditor
      categorySlug={categorySlug}
      categoryLabel={categoryLabel}
      values={values}
      onChange={onChange}
      disabled={disabled}
      variant={variant}
    />
  );
}
