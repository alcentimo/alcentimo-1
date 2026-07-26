"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductTitleAutoDetectHintProps {
  detecting?: boolean;
  hint?: string | null;
  className?: string;
}

export function ProductTitleAutoDetectHint({
  detecting = false,
  hint,
  className,
}: ProductTitleAutoDetectHintProps) {
  if (!detecting && !hint) return null;

  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {detecting ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      )}
      {detecting ? "Analizando título…" : hint}
    </p>
  );
}
