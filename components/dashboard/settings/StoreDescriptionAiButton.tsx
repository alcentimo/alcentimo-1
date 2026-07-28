"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || loading || !canGenerate}
        onClick={() => void handleGenerate()}
        className="h-8 gap-1.5 px-2.5 text-xs"
        aria-label="Generar descripción con IA"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Generar descripción con IA
      </Button>
      {error ? (
        <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
