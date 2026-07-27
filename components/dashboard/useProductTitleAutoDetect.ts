"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectProductFromTitle,
  mergeDetectedExtraFields,
} from "@/lib/products/detect-product-from-title";
import { resolveProductFieldLabels } from "@/lib/products/resolve-product-field-labels";
import { pickExtraFieldValues, type ProductExtraFieldsMap } from "@/lib/products/extra-fields";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { ProductCategoryOption } from "@/src/config/categories";

/** Confianza mínima para aplicar categoría/specs (solo diccionario local). */
const MIN_RULES_CONFIDENCE = 2;

interface UseProductTitleAutoDetectOptions {
  title: string;
  rubro: string;
  categories: ProductCategoryOption[];
  categorySlug: string;
  setCategorySlug: (slug: string) => void;
  extraFields: ProductExtraFieldsMap;
  setExtraFields: React.Dispatch<React.SetStateAction<ProductExtraFieldsMap>>;
  applyCategory?: boolean;
  initialTitle?: string;
  enabled?: boolean;
  debounceMs?: number;
  minLength?: number;
}

/**
 * Autodetección 100 % local (sin IA ni fetch). Instantánea tras el debounce.
 */
export function useProductTitleAutoDetect({
  title,
  rubro,
  categories,
  categorySlug,
  setCategorySlug,
  setExtraFields,
  applyCategory = true,
  initialTitle,
  enabled = true,
  debounceMs = 350,
  minLength = 3,
}: UseProductTitleAutoDetectOptions) {
  const debouncedTitle = useDebouncedValue(title, debounceMs);
  const [hint, setHint] = useState<string | null>(null);
  const categoryLockedRef = useRef(false);
  const lastProcessedTitleRef = useRef<string | null>(null);
  const initialTitleRef = useRef(initialTitle?.trim() ?? "");
  const categorySlugRef = useRef(categorySlug);
  const applyCategoryRef = useRef(applyCategory);

  categorySlugRef.current = categorySlug;
  applyCategoryRef.current = applyCategory;

  const categoriesKey = categories.map((item) => `${item.slug}:${item.label}`).join("|");

  const applyDetection = useCallback(
    (
      detectedSlug: string | null,
      detectedLabel: string | null,
      detectedExtra: ProductExtraFieldsMap,
    ) => {
      const slug = detectedSlug ?? categorySlugRef.current;
      const labels = resolveProductFieldLabels(rubro, slug);

      if (applyCategoryRef.current && detectedSlug && !categoryLockedRef.current) {
        setCategorySlug(detectedSlug);
      }

      if (Object.keys(detectedExtra).length > 0) {
        setExtraFields((prev) =>
          pickExtraFieldValues(
            mergeDetectedExtraFields(prev, detectedExtra, labels),
            labels,
          ),
        );
      }

      if (detectedLabel && detectedSlug) {
        setHint(
          applyCategoryRef.current
            ? `Categoría detectada: ${detectedLabel}`
            : `Datos detectados según «${detectedLabel}»`,
        );
      } else if (!detectedSlug) {
        setHint(null);
      }
    },
    [rubro, setCategorySlug, setExtraFields],
  );

  const handleCategoryManualChange = useCallback(
    (slug: string) => {
      categoryLockedRef.current = true;
      setCategorySlug(slug);
      setHint(null);
    },
    [setCategorySlug],
  );

  useEffect(() => {
    if (!enabled) return;

    const trimmed = debouncedTitle.trim();
    if (trimmed.length < minLength) {
      setHint(null);
      return;
    }

    if (trimmed === initialTitleRef.current) return;
    if (trimmed === lastProcessedTitleRef.current) return;

    categoryLockedRef.current = false;

    const categoryCandidates = categories.map((item) => ({
      slug: item.slug,
      label: item.label,
    }));

    const result = detectProductFromTitle(trimmed, rubro, categoryCandidates);

    if (result.confidence >= MIN_RULES_CONFIDENCE && result.categorySlug) {
      applyDetection(result.categorySlug, result.categoryLabel, result.extraFields);
      lastProcessedTitleRef.current = trimmed;
      return;
    }

    if (Object.keys(result.extraFields).length > 0) {
      applyDetection(null, null, result.extraFields);
      lastProcessedTitleRef.current = trimmed;
      return;
    }

    setHint(null);
    lastProcessedTitleRef.current = trimmed;
  }, [debouncedTitle, enabled, minLength, rubro, categoriesKey, applyDetection]);

  return {
    hint,
    handleCategoryManualChange,
  };
}
