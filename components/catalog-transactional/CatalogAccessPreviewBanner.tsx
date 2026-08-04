"use client";

/** Banner sutil cuando el staff previsualiza un catálogo no público. */
export function CatalogAccessPreviewBanner({ modeLabel }: { modeLabel: string }) {
  return (
    <div
      className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      Vista previa · Catálogo en modo «{modeLabel}». Los visitantes no lo ven
      como público.
    </div>
  );
}
