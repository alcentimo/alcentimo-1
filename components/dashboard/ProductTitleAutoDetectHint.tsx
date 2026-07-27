"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductTitleAutoDetectHintProps {
  hint?: string | null;
  className?: string;
}

export function ProductTitleAutoDetectHint({
  hint,
  className,
}: ProductTitleAutoDetectHintProps) {
  if (!hint) return null;

  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Sparkles className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      {hint}
    </p>
  );
}
