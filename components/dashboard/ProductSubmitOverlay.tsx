"use client";

import { Loader2 } from "lucide-react";

interface ProductSubmitOverlayProps {
  visible: boolean;
  hasImage: boolean;
  mode?: "create" | "edit";
}

export function ProductSubmitOverlay({
  visible,
  hasImage,
  mode = "create",
}: ProductSubmitOverlayProps) {
  if (!visible) return null;

  const title =
    mode === "edit"
      ? hasImage
        ? "Actualizando producto e imagen…"
        : "Guardando cambios…"
      : hasImage
        ? "Publicando producto e imagen…"
        : "Publicando producto…";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/55 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3">
          <Loader2
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-teal-600 dark:text-teal-400"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {hasImage
                ? "La imagen ya está optimizada en tu dispositivo. Ahora la subimos y guardamos el producto."
                : "Esto puede tardar unos segundos. No cierres esta ventana."}
            </p>
            {hasImage ? (
              <ol className="mt-3 space-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-teal-600 dark:text-teal-400">✓</span>
                  Imagen optimizada (WebP)
                </li>
                <li className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-teal-600" aria-hidden="true" />
                  Subiendo al servidor…
                </li>
                <li className="flex items-center gap-2 opacity-60">
                  <span className="inline-block h-3 w-3 rounded-full border border-zinc-300 dark:border-zinc-600" />
                  Guardando en catálogo
                </li>
              </ol>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
