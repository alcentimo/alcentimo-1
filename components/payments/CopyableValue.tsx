"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyableValueProps {
  value: string;
  label?: string;
  mono?: boolean;
}

export function CopyableValue({ value, label, mono = false }: CopyableValueProps) {
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
    <div className="flex items-start justify-between gap-2">
      <dd
        className={`min-w-0 flex-1 text-sm font-medium break-all text-zinc-900 dark:text-zinc-100 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-label={label ? `Copiar ${label}` : "Copiar"}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            Copiado
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copiar
          </>
        )}
      </button>
    </div>
  );
}
