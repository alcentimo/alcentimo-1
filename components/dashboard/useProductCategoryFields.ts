"use client";

import { useEffect, useMemo, useState } from "react";
import { CUSTOM_PRODUCT_CATEGORY_VALUE } from "@/lib/products/category-selection";
import { getExtraFieldsForProductCategory } from "@/src/config/categories";
import {
  filterExtraFieldsForActiveModule,
  getActiveProductModuleId,
} from "@/lib/rubros/registry";
import { getTechSpecLabels } from "@/lib/rubros/modules/tecnologia/config";
import { getCollectibleFieldLabels } from "@/lib/rubros/modules/coleccionables/config";
import { getBeautyFieldLabels } from "@/lib/rubros/modules/salud-belleza/config";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  pickExtraFieldValues,
  type ProductExtraFieldsMap,
} from "@/lib/products/extra-fields";

function resolveInitialCategorySlug(
  config: StoreProductFormConfig,
  initialCategorySlug?: string,
): string {
  if (initialCategorySlug) {
    const exists = config.productCategories.some(
      (item) => item.slug === initialCategorySlug,
    );
    if (exists) return initialCategorySlug;
  }
  return config.productCategories[0]?.slug ?? "general";
}

export function useProductCategoryFields(
  config: StoreProductFormConfig,
  initialCategorySlug?: string,
  initialExtraFields?: ProductExtraFieldsMap,
) {
  const [categorySlug, setCategorySlug] = useState(() =>
    resolveInitialCategorySlug(config, initialCategorySlug),
  );
  const [customCategoryName, setCustomCategoryName] = useState("");

  const categoriesKey = config.productCategories.map((item) => item.slug).join("|");

  /** Al cambiar el rubro (o la lista de categorías), alinear la selección. */
  useEffect(() => {
    setCategorySlug(resolveInitialCategorySlug(config, initialCategorySlug));
    // categoriesKey refleja cambios en productCategories sin depender de la referencia del array.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config se usa vía rubro + categoriesKey
  }, [config.rubroTienda, categoriesKey, initialCategorySlug]);

  const fieldLabels = useMemo(() => {
    if (categorySlug === CUSTOM_PRODUCT_CATEGORY_VALUE) return [];
    const moduleId = getActiveProductModuleId(config.rubroTienda);
    if (moduleId === "tecnologia") {
      return getTechSpecLabels(null);
    }
    if (moduleId === "coleccionables") {
      return getCollectibleFieldLabels();
    }
    if (moduleId === "salud-belleza") {
      return getBeautyFieldLabels();
    }
    return filterExtraFieldsForActiveModule(
      config.rubroTienda,
      getExtraFieldsForProductCategory(config.rubroTienda, categorySlug),
    );
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
