"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface ProductCopyAiFieldsProps {
  idPrefix: string;
  name: string;
  onNameChange: (value: string) => void;
  shortDescription: string;
  onShortDescriptionChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  storeRubro?: string | null;
  categoryLabel?: string | null;
  disabled?: boolean;
  /** Estilo compacto del catálogo (sheet/dialog) vs página completa. */
  variant?: "compact" | "default";
  namePlaceholder?: string;
  showDescription?: boolean;
  showShortDescription?: boolean;
}

export function ProductCopyAiFields({
  idPrefix,
  name,
  onNameChange,
  shortDescription,
  onShortDescriptionChange,
  description,
  onDescriptionChange,
  storeRubro,
  categoryLabel,
  disabled = false,
  variant = "compact",
  namePlaceholder = "Ej: Nombre del producto",
  showDescription = true,
  showShortDescription = true,
}: ProductCopyAiFieldsProps) {
  const [aiError, setAiError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);

  const isCompact = variant === "compact";
  const labelClassName = isCompact ? "payment-field-label" : "label-field";
  const inputClassName = isCompact
    ? "payment-field-input mt-1.5"
    : "input-field";
  const textareaClassName = cn(
    inputClassName,
    "min-h-[8rem] resize-y leading-relaxed",
  );

  const canImprove =
    name.trim().length >= 2 ||
    description.trim().length >= 2 ||
    shortDescription.trim().length >= 2;

  const runImproveAll = useCallback(async () => {
    if (!canImprove) {
      setAiError(
        "Escribe al menos un título o descripción básica antes de mejorar con IA.",
      );
      return;
    }

    setAiError(null);
    setImproving(true);

    try {
      const response = await fetch("/api/dashboard/products/improve-copy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftTitle: name,
          draftDescription: description || shortDescription,
          storeRubro,
          categoryLabel,
          focus: "all",
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        title?: string;
        shortDescription?: string;
        description?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo mejorar el texto.");
      }

      if (payload.title) onNameChange(payload.title);
      if (payload.shortDescription) {
        onShortDescriptionChange(payload.shortDescription);
      }
      if (payload.description) onDescriptionChange(payload.description);
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : "Error al mejorar con IA.",
      );
    } finally {
      setImproving(false);
    }
  }, [
    canImprove,
    name,
    description,
    shortDescription,
    storeRubro,
    categoryLabel,
    onNameChange,
    onShortDescriptionChange,
    onDescriptionChange,
  ]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || improving || !canImprove}
            onClick={() => void runImproveAll()}
            className="product-ai-improve-btn h-8 shrink-0 gap-1.5 px-2.5 text-xs"
            aria-label="Mejorar textos del producto con IA"
          >
            {improving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Mejorar con IA
          </Button>
        </div>
        {showDescription || showShortDescription ? (
          <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Optimiza nombre, descripción corta y descripción completa de una sola
            vez. Escribe un borrador breve antes de pulsar.
          </p>
        ) : (
          <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            Mejora el nombre y genera descripciones (en ajustes avanzados) a
            partir de un borrador breve.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-name`} className={labelClassName}>
          {isCompact ? "Nombre" : "Nombre del producto"}
          <span className="text-red-500"> *</span>
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      {showDescription ? (
        <div>
          <Label htmlFor={`${idPrefix}-description`} className={labelClassName}>
            Descripción
          </Label>
          <Textarea
            id={`${idPrefix}-description`}
            name="description"
            maxLength={1800}
            rows={isCompact ? 3 : 5}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Beneficios, materiales, uso… La IA puede ampliarlo con viñetas."
            disabled={disabled}
            className={textareaClassName}
          />
        </div>
      ) : null}

      {showShortDescription ? (
        <div>
          <Label
            htmlFor={`${idPrefix}-short-description`}
            className={labelClassName}
          >
            Descripción corta
          </Label>
          <Input
            id={`${idPrefix}-short-description`}
            name="short_description"
            maxLength={160}
            value={shortDescription}
            onChange={(event) => onShortDescriptionChange(event.target.value)}
            placeholder="Aparece en el listado del catálogo"
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      ) : null}

      {aiError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          {aiError}
        </p>
      ) : null}
    </div>
  );
}
