"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function ExportHelpHint() {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = pinned || hovered;

  useEffect(() => {
    if (!pinned) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinned(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pinned]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="Guía de exportación"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors",
          "hover:bg-teal-50 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
          "dark:text-zinc-500 dark:hover:bg-teal-950/30 dark:hover:text-teal-400",
        )}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Guía de Exportación
          </p>
          <ul className="space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Excel (.xlsx):
              </span>{" "}
              Ideal para auditorías y cambios masivos de inventario.
            </li>
            <li>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">PDF:</span>{" "}
              Crea un catálogo profesional de ventas con vista previa incluida.
            </li>
            <li>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">CSV:</span>{" "}
              Formato técnico universal para integrar tu inventario con otros sistemas.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
