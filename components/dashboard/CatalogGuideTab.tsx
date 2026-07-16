"use client";

import { ExternalLink, Package, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogGuideTabProps {
  onGoToAjustes: () => void;
  onGoToInventario: () => void;
  catalogUrl: string;
}

export function CatalogGuideTab({
  onGoToAjustes,
  onGoToInventario,
  catalogUrl,
}: CatalogGuideTabProps) {
  return (
    <div className="space-y-4">
      <div className="general-settings-card border-teal-100 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Configuración inicial
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Sigue estos tres pasos para dejar tu vitrina lista. Esta guía desaparece
              cuando publiques tu primer producto.
            </p>
          </div>
        </div>
      </div>

      <ol className="space-y-3">
        <li className="general-settings-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              1
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Configura tu marca
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Nombre, logo, descripción y métodos de pago en Ajustes.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
            onClick={onGoToAjustes}
          >
            Ir a Ajustes
          </Button>
        </li>

        <li className="general-settings-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              2
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Sube tus productos
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Publica tu primer producto con foto y precio en Bs.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
            onClick={onGoToInventario}
          >
            Ir a Inventario
          </Button>
        </li>

        <li className="general-settings-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              3
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Comparte tu link
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Abre tu catálogo público y envíalo por WhatsApp o redes.
              </p>
            </div>
          </div>
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand inline-flex h-8 w-full shrink-0 items-center justify-center rounded-lg px-3 text-xs font-medium sm:w-auto"
          >
            Ver mi catálogo
          </a>
        </li>
      </ol>
    </div>
  );
}
