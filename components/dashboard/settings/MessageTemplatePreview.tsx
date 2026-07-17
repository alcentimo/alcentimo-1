"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { getMessageTemplatePreviewValues } from "@/lib/orders/message-templates";
import { renderMessageTemplate } from "@/lib/orders/render-order-message";

interface MessageTemplatePreviewProps {
  template: string;
  storeName?: string;
}

export function MessageTemplatePreview({
  template,
  storeName,
}: MessageTemplatePreviewProps) {
  const preview = useMemo(
    () =>
      renderMessageTemplate(
        template,
        getMessageTemplatePreviewValues(storeName),
      ),
    [template, storeName],
  );

  return (
    <div className="flex min-h-[8rem] flex-col">
      <p className="payment-field-label">Vista previa</p>
      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        Así verá el cliente el mensaje en WhatsApp (datos de ejemplo).
      </p>
      <div
        className="mt-2 flex flex-1 flex-col rounded-xl border border-emerald-200/70 bg-[#ece5dd] p-3 dark:border-emerald-900/40 dark:bg-zinc-900/60"
        aria-live="polite"
      >
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800/70 dark:text-emerald-400/80">
          <MessageCircle className="h-3 w-3" aria-hidden="true" />
          WhatsApp
        </div>
        <div className="max-w-[95%] self-start rounded-lg rounded-tl-none bg-[#dcf8c6] px-3 py-2.5 shadow-sm dark:bg-emerald-950/50">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
            {preview || (
              <span className="text-zinc-400 italic">
                Escribe una plantilla para ver la vista previa.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
