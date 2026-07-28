"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface StoreDescriptionAiButtonProps {
  storeName: string;
  storeRubro: string;
  draftDescription: string;
  disabled?: boolean;
  onGenerated: (description: string) => void;
}

/** Genera descripción de identidad con la misma IA (OpenRouter / gpt-4o-mini). */
export function StoreDescriptionAiButton({
  storeName,
  storeRubro,
  draftDescription,
  disabled = false,
  onGenerated,
}: StoreDescriptionAiButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = storeName.trim().length >= 2;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) {
      setError(
        "Escribe el nombre comercial de la tienda antes de generar la descripción.",
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/settings/generate-store-description",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName,
            storeRubro,
            draftDescription,
          }),
        },
      );

      const payload = (await response.json()) as {
        description?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo generar la descripción.");
      }

      if (!payload.description?.trim()) {
        throw new Error("La IA no devolvió una descripción válida.");
      }

      onGenerated(payload.description.trim());
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Error al generar con IA.",
      );
    } finally {
      setLoading(false);
    }
  }, [canGenerate, draftDescription, onGenerated, storeName, storeRubro]);

  return (
    <div>
      <button
        type="button"
        disabled={disabled || loading || !canGenerate}
        onClick={() => void handleGenerate()}
        className="product-ai-improve-btn h-8"
        aria-label="Generar descripción con IA"
      >
        {loading ? (
          <Loader2
            className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-600 dark:text-violet-400"
            aria-hidden="true"
          />
        ) : (
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400"
            aria-hidden="true"
          />
        )}
        Generar descripción con IA
      </button>
      {error ? (
        <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
