"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ImproveProductCopyFocus } from "@/lib/ai/product-copy-types";

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
  showShortDescription?: boolean;
}

function FieldLabelRow({
  htmlFor,
  label,
  required,
  onImprove,
  improving,
  disabled,
  labelClassName,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  onImprove: () => void;
  improving: boolean;
  disabled?: boolean;
  labelClassName: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || improving}
        onClick={onImprove}
        className="product-ai-improve-btn h-7 shrink-0 gap-1 px-2 text-xs"
        aria-label={`Mejorar ${label.toLowerCase()} con IA`}
      >
        {improving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Mejorar con IA
      </Button>
    </div>
  );
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
  namePlaceholder = "Ej: Camisa Oxford azul",
  showShortDescription = true,
}: ProductCopyAiFieldsProps) {
  const [aiError, setAiError] = useState<string | null>(null);
  const [improvingFocus, setImprovingFocus] =
    useState<ImproveProductCopyFocus | null>(null);

  const isCompact = variant === "compact";
  const labelClassName = isCompact ? "payment-field-label" : "label-field";
  const inputClassName = isCompact
    ? "payment-field-input mt-1.5"
    : "input-field";
  const textareaClassName = cn(
    inputClassName,
    "min-h-[8rem] resize-y leading-relaxed",
  );

  const runImprove = useCallback(
    async (focus: ImproveProductCopyFocus) => {
      setAiError(null);
      setImprovingFocus(focus);

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
            focus,
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
        setImprovingFocus(null);
      }
    },
    [
      name,
      description,
      shortDescription,
      storeRubro,
      categoryLabel,
      onNameChange,
      onShortDescriptionChange,
      onDescriptionChange,
    ],
  );

  return (
    <div className="space-y-4">
      <div>
        <FieldLabelRow
          htmlFor={`${idPrefix}-name`}
          label={isCompact ? "Nombre" : "Nombre del producto"}
          required
          onImprove={() => void runImprove("title")}
          improving={improvingFocus === "title"}
          disabled={disabled}
          labelClassName={labelClassName}
        />
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

      <div>
        <FieldLabelRow
          htmlFor={`${idPrefix}-description`}
          label="Descripción"
          onImprove={() => void runImprove("description")}
          improving={improvingFocus === "description"}
          disabled={disabled}
          labelClassName={labelClassName}
        />
        <Textarea
          id={`${idPrefix}-description`}
          name="description"
          maxLength={1800}
          rows={5}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Describe el producto. Puedes escribir algo breve y pulsar «Mejorar con IA»."
          disabled={disabled}
          className={textareaClassName}
        />
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          La IA puede añadir viñetas de beneficios listas para vender.
        </p>
      </div>

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
