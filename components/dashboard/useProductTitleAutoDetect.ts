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

interface UseProductTitleAutoDetectOptions {
  title: string;
  rubro: string;
  categories: ProductCategoryOption[];
  categorySlug: string;
  setCategorySlug: (slug: string) => void;
  extraFields: ProductExtraFieldsMap;
  setExtraFields: React.Dispatch<React.SetStateAction<ProductExtraFieldsMap>>;
  /** Si false, no cambia la categoría (rubros que ocultan el selector). */
  applyCategory?: boolean;
  /** Si el título coincide con el inicial (edición), no autodetectar hasta que cambie. */
  initialTitle?: string;
  enabled?: boolean;
  debounceMs?: number;
  minLength?: number;
}

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
  debounceMs = 650,
  minLength = 4,
}: UseProductTitleAutoDetectOptions) {
  const debouncedTitle = useDebouncedValue(title, debounceMs);
  const [detecting, setDetecting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const categoryLockedRef = useRef(false);
  const lastProcessedTitleRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialTitleRef = useRef(initialTitle?.trim() ?? "");

  const applyDetection = useCallback(
    (
      detectedSlug: string | null,
      detectedLabel: string | null,
      detectedExtra: ProductExtraFieldsMap,
    ) => {
      const slug = detectedSlug ?? categorySlug;
      const labels = resolveProductFieldLabels(rubro, slug);

      if (applyCategory && detectedSlug && !categoryLockedRef.current) {
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

      if (detectedLabel) {
        setHint(
          applyCategory
            ? `Categoría sugerida: ${detectedLabel}`
            : `Datos sugeridos según «${detectedLabel}»`,
        );
      }
    },
    [
      applyCategory,
      categorySlug,
      rubro,
      setCategorySlug,
      setExtraFields,
    ],
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

    if (trimmed === initialTitleRef.current) {
      return;
    }

    if (trimmed === lastProcessedTitleRef.current) return;

    categoryLockedRef.current = false;

    const categoryCandidates = categories.map((item) => ({
      slug: item.slug,
      label: item.label,
    }));

    const instant = detectProductFromTitle(trimmed, rubro, categoryCandidates);
    if (instant.confidence >= 2) {
      applyDetection(instant.categorySlug, instant.categoryLabel, instant.extraFields);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchSuggestions() {
      setDetecting(true);
      try {
        const response = await fetch("/api/dashboard/products/suggest-metadata", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            draftTitle: trimmed,
            storeRubro: rubro,
            categories: categoryCandidates,
          }),
        });

        if (!response.ok) return;

        const payload = (await response.json()) as {
          categorySlug?: string | null;
          categoryLabel?: string | null;
          extraFields?: ProductExtraFieldsMap;
        };

        applyDetection(
          payload.categorySlug ?? null,
          payload.categoryLabel ?? null,
          payload.extraFields ?? {},
        );
        lastProcessedTitleRef.current = trimmed;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) {
          setDetecting(false);
        }
      }
    }

    void fetchSuggestions();

    return () => controller.abort();
  }, [
    debouncedTitle,
    enabled,
    minLength,
    rubro,
    categories,
    applyDetection,
  ]);

  return {
    detecting,
    hint,
    handleCategoryManualChange,
  };
}
