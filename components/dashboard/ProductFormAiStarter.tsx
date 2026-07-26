"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createOnboardingSampleProducts } from "@/lib/onboarding/sample-products-actions";

interface ProductFormAiStarterProps {
  rubroLabel?: string | null;
  onSamplesCreated: () => void;
  disabled?: boolean;
}

export function ProductFormAiStarter({
  rubroLabel,
  onSamplesCreated,
  disabled = false,
}: ProductFormAiStarterProps) {
  const [creating, startCreate] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    setFeedback(null);
    setError(null);
    startCreate(async () => {
      const result = await createOnboardingSampleProducts();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback(
        result.created === 1
          ? "Se agregó 1 producto de ejemplo."
          : `Se agregaron ${result.created} productos de ejemplo.`,
      );
      onSamplesCreated();
    });
  }, [onSamplesCreated]);

  return (
    <div className="product-form-ai-starter">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {rubroLabel
            ? `Genera productos de ejemplo para ${rubroLabel} y publícalos al instante.`
            : "Genera productos de ejemplo con IA y publícalos al instante."}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          disabled={disabled || creating}
          onClick={handleCreate}
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Crear con ayuda de IA
        </Button>
      </div>
      {feedback ? (
        <p className="product-form-ai-starter-feedback product-form-ai-starter-feedback-success">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="product-form-ai-starter-feedback product-form-ai-starter-feedback-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
