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

const FETCH_TIMEOUT_MS = 8_000;
/** Confianza mínima de reglas locales para aplicar sin llamar a la API. */
const RULES_ONLY_CONFIDENCE = 2;

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
  debounceMs = 800,
  minLength = 4,
}: UseProductTitleAutoDetectOptions) {
  const debouncedTitle = useDebouncedValue(title, debounceMs);
  const [detecting, setDetecting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const categoryLockedRef = useRef(false);
  const lastProcessedTitleRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
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

      if (detectedLabel) {
        setHint(
          applyCategoryRef.current
            ? `Categoría sugerida: ${detectedLabel}`
            : `Datos sugeridos según «${detectedLabel}»`,
        );
      } else if (!detectedSlug) {
        setHint(null);
      }
    },
    [rubro, setCategorySlug, setExtraFields],
  );

  const applyDetectionRef = useRef(applyDetection);
  applyDetectionRef.current = applyDetection;

  const handleCategoryManualChange = useCallback(
    (slug: string) => {
      categoryLockedRef.current = true;
      setCategorySlug(slug);
      setHint(null);
    },
    [setCategorySlug],
  );

  useEffect(() => {
    if (!enabled) {
      setDetecting(false);
      return;
    }

    const trimmed = debouncedTitle.trim();
    if (trimmed.length < minLength) {
      setHint(null);
      setDetecting(false);
      return;
    }

    if (trimmed === initialTitleRef.current) {
      setDetecting(false);
      return;
    }

    if (trimmed === lastProcessedTitleRef.current) {
      setDetecting(false);
      return;
    }

    categoryLockedRef.current = false;

    const categoryCandidates = categories.map((item) => ({
      slug: item.slug,
      label: item.label,
    }));

    const instant = detectProductFromTitle(trimmed, rubro, categoryCandidates);

    if (instant.confidence >= RULES_ONLY_CONFIDENCE && instant.categorySlug) {
      applyDetectionRef.current(
        instant.categorySlug,
        instant.categoryLabel,
        instant.extraFields,
      );
      lastProcessedTitleRef.current = trimmed;
      setDetecting(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestSeqRef.current;
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT_MS,
    );

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

        if (requestId !== requestSeqRef.current) return;

        if (!response.ok) {
          if (instant.categorySlug) {
            applyDetectionRef.current(
              instant.categorySlug,
              instant.categoryLabel,
              instant.extraFields,
            );
          }
          return;
        }

        const payload = (await response.json()) as {
          categorySlug?: string | null;
          categoryLabel?: string | null;
          extraFields?: ProductExtraFieldsMap;
          error?: string;
        };

        if (payload.error) return;

        const slug = payload.categorySlug ?? instant.categorySlug;
        const label = payload.categoryLabel ?? instant.categoryLabel;

        applyDetectionRef.current(slug, label, payload.extraFields ?? instant.extraFields);
        lastProcessedTitleRef.current = trimmed;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (requestId !== requestSeqRef.current) return;
        if (instant.categorySlug) {
          applyDetectionRef.current(
            instant.categorySlug,
            instant.categoryLabel,
            instant.extraFields,
          );
          lastProcessedTitleRef.current = trimmed;
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (requestId === requestSeqRef.current) {
          setDetecting(false);
        }
      }
    }

    void fetchSuggestions();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    debouncedTitle,
    enabled,
    minLength,
    rubro,
    categoriesKey,
  ]);

  return {
    detecting,
    hint,
    handleCategoryManualChange,
  };
}
