"use client";

import { useEffect, useMemo, useState } from "react";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
import { getExtraFieldsForProductCategory } from "@/src/config/categories";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  pickExtraFieldValues,
  type ProductExtraFieldsMap,
} from "@/lib/products/extra-fields";

function resolveInitialCategorySlug(
  config: StoreProductFormConfig,
  initialCategorySlug?: string,
): string {
  if (initialCategorySlug) return initialCategorySlug;
  return config.productCategories[0]?.slug ?? "general";
}

export function useProductCategoryFields(
  config: StoreProductFormConfig,
  initialCategorySlug?: string,
  initialExtraFields?: ProductExtraFieldsMap,
) {
  const defaultSlug = resolveInitialCategorySlug(config, initialCategorySlug);
  const [categorySlug, setCategorySlug] = useState(defaultSlug);
  const [customCategoryName, setCustomCategoryName] = useState("");

  useEffect(() => {
    if (initialCategorySlug) {
      setCategorySlug(initialCategorySlug);
    }
  }, [initialCategorySlug]);

  const fieldLabels = useMemo(() => {
    if (categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE) return [];
    return getExtraFieldsForProductCategory(config.rubroTienda, categorySlug);
  }, [config.rubroTienda, categorySlug]);

  const categoryLabel = useMemo(() => {
    if (categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE) {
      return customCategoryName.trim() || "Nueva categoría";
    }
    return (
      config.productCategories.find((item) => item.slug === categorySlug)?.label ??
      null
    );
  }, [config.productCategories, categorySlug, customCategoryName]);

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
    customCategoryName,
    setCustomCategoryName,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  };
}
