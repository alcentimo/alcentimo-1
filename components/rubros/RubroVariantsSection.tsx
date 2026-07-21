"use client";

import dynamic from "next/dynamic";
import type { VariantFormInput } from "@/lib/products/variants";
import { ProductVariantsEditor } from "@/components/dashboard/ProductVariantsEditor";
import { getActiveProductModuleId } from "@/lib/rubros/registry";
import type { StoreRubro } from "@/src/config/categories";

const FashionVariantsEditor = dynamic(
  () =>
    import("@/components/rubros/ropa-moda/FashionVariantsEditor").then(
      (mod) => mod.FashionVariantsEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40" />
    ),
  },
);

interface RubroVariantsSectionProps {
  rubro: StoreRubro | string;
  variants: VariantFormInput[];
  onChange: (variants: VariantFormInput[]) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Carga el editor de variantes del rubro activo (lazy).
 * Otros rubros usan el editor genérico sin importar módulos pesados.
 */
export function RubroVariantsSection({
  rubro,
  variants,
  onChange,
  disabled = false,
  required = false,
}: RubroVariantsSectionProps) {
  const moduleId = getActiveProductModuleId(rubro);

  if (moduleId === "ropa-moda") {
    return (
      <FashionVariantsEditor
        variants={variants}
        onChange={onChange}
        disabled={disabled}
        required
      />
    );
  }

  return (
    <ProductVariantsEditor
      variants={variants}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
