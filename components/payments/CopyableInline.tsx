"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyableInlineProps {
  value: string;
  label: string;
  mono?: boolean;
}

export function CopyableInline({ value, label, mono = false }: CopyableInlineProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/80 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            <span className="sr-only">Copiado</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Copiar</span>
          </>
        )}
      </button>
    </div>
  );
}
