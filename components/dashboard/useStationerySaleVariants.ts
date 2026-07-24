"use client";

import { useEffect, useRef } from "react";
import type { VariantFormInput } from "@/lib/products/variants";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { syncStationerySaleVariants } from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";

export function useStationerySaleVariants(
  enabled: boolean,
  extraFields: ProductExtraFieldsMap,
  variants: VariantFormInput[],
  onChange: (variants: VariantFormInput[]) => void,
) {
  const variantsRef = useRef(variants);
  variantsRef.current = variants;

  useEffect(() => {
    if (!enabled) return;

    const next = syncStationerySaleVariants(extraFields, variantsRef.current);
    const currentJson = JSON.stringify(variantsRef.current);
    const nextJson = JSON.stringify(next);
    if (currentJson !== nextJson) {
      onChange(next);
    }
  }, [
    enabled,
    extraFields["Presentación"],
    extraFields["Unidades por empaque"],
    onChange,
  ]);
}
