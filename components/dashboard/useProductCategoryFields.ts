"use client";

import { useEffect, useMemo, useState } from "react";
import { getExtraFieldsForProductCategory } from "@/src/config/categories";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  pickExtraFieldValues,
  type ProductExtraFieldsMap,
} from "@/lib/products/extra-fields";

export function useProductCategoryFields(
  config: StoreProductFormConfig,
  initialCategorySlug?: string,
  initialExtraFields?: ProductExtraFieldsMap,
) {
  const defaultSlug =
    initialCategorySlug ?? config.productCategories[0]?.slug ?? "general";

  const [categorySlug, setCategorySlug] = useState(defaultSlug);

  useEffect(() => {
    if (initialCategorySlug) {
      setCategorySlug(initialCategorySlug);
    }
  }, [initialCategorySlug]);

  const fieldLabels = useMemo(
    () => getExtraFieldsForProductCategory(config.rubroTienda, categorySlug),
    [config.rubroTienda, categorySlug],
  );

  const categoryLabel = useMemo(
    () =>
      config.productCategories.find((item) => item.slug === categorySlug)?.label ??
      null,
    [config.productCategories, categorySlug],
  );

  const [extraFields, setExtraFields] = useState<ProductExtraFieldsMap>(() =>
    pickExtraFieldValues(initialExtraFields ?? {}, fieldLabels),
  );

  useEffect(() => {
    setExtraFields((prev) => pickExtraFieldValues(prev, fieldLabels));
  }, [fieldLabels]);

  useEffect(() => {
    if (!initialExtraFields) return;
    setExtraFields(pickExtraFieldValues(initialExtraFields, fieldLabels));
  }, [initialExtraFields, fieldLabels]);

  return {
    categorySlug,
    setCategorySlug,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  };
}
