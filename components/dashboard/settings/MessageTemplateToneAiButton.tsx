"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MESSAGE_TEMPLATE_TONE_OPTIONS,
  type MessageTemplateTone,
} from "@/lib/ai/message-template-tone-types";
import type { OrderMessageTemplateKey } from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface MessageTemplateToneAiButtonProps {
  templateKey: OrderMessageTemplateKey;
  template: string;
  disabled?: boolean;
  onRewritten: (template: string) => void;
}

export function MessageTemplateToneAiButton({
  templateKey,
  template,
  disabled = false,
  onRewritten,
}: MessageTemplateToneAiButtonProps) {
  const [tone, setTone] = useState<MessageTemplateTone>("profesional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRewrite = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/settings/rewrite-message-template",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template,
            templateKey,
            tone,
          }),
        },
      );

      const payload = (await response.json()) as {
        template?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo personalizar la plantilla.");
      }

      if (!payload.template?.trim()) {
        throw new Error("La IA no devolvió una plantilla válida.");
      }

      onRewritten(payload.template.trim());
    } catch (rewriteError) {
      setError(
        rewriteError instanceof Error
          ? rewriteError.message
          : "Error al personalizar con IA.",
      );
    } finally {
      setLoading(false);
    }
  }, [onRewritten, template, templateKey, tone]);

  return (
    <div className="message-template-tone-ai">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          Tono
        </span>
        <div
          className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/40"
          role="radiogroup"
          aria-label="Tono del mensaje"
        >
          {MESSAGE_TEMPLATE_TONE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={tone === option.value}
              disabled={disabled || loading}
              onClick={() => setTone(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                tone === option.value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading || !template.trim()}
          onClick={() => void handleRewrite()}
          className="h-8 gap-1.5 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Personalizar tono con IA
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
