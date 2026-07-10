import { Loader2 } from "lucide-react";

export function SavingHint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      Guardando…
    </span>
  );
}
