"use client";

import { useState } from "react";
import { Eye, MonitorSmartphone, Smartphone } from "lucide-react";
import type { CatalogListItem, Store } from "@/lib/database.types";
import type { CatalogPreviewSettings } from "@/lib/catalog/get-public-catalog-page-data";
import { CatalogLivePreview } from "@/components/dashboard/CatalogLivePreview";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export type CatalogPreviewViewport = "mobile" | "desktop";

const VIEWPORT_WIDTH: Record<CatalogPreviewViewport, number> = {
  mobile: 375,
  desktop: 1024,
};

interface CatalogPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  products: CatalogListItem[];
  exchangeRate: number | null;
  exchangeRateUpdatedAt?: string | null;
  settings: CatalogPreviewSettings;
}

export function CatalogPreviewDrawer({
  open,
  onOpenChange,
  store,
  products,
  exchangeRate,
  exchangeRateUpdatedAt,
  settings,
}: CatalogPreviewDrawerProps) {
  const [viewport, setViewport] = useState<CatalogPreviewViewport>("mobile");
  const isDesktopViewport = viewport === "desktop";
  const viewportWidth = VIEWPORT_WIDTH[viewport];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false} lockScroll={false}>
        <SheetContent
          className="catalog-preview-drawer w-full max-w-[min(100vw,1120px)] border-l border-zinc-200 shadow-2xl dark:border-zinc-800"
          onClose={() => onOpenChange(false)}
        >
          <SheetHeader className="catalog-preview-drawer-header">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
              <div>
                <SheetTitle>Vista previa en vivo</SheetTitle>
                <SheetDescription>
                  Los cambios en productos se reflejan al instante. Puedes seguir editando
                  el catálogo con este panel abierto.
                </SheetDescription>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    !isDesktopViewport
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  Vista móvil
                </span>
                <SettingsSwitch
                  id="catalog-preview-viewport"
                  checked={isDesktopViewport}
                  onChange={(checked) => setViewport(checked ? "desktop" : "mobile")}
                  label="Alternar entre vista móvil y vista desktop"
                />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    isDesktopViewport
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  Vista desktop
                </span>
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="catalog-preview-drawer-body">
            <div className="catalog-preview-stage">
              <div
                className={cn(
                  "catalog-preview-viewport",
                  isDesktopViewport
                    ? "catalog-preview-viewport--desktop"
                    : "catalog-preview-viewport--mobile",
                )}
                style={{ width: viewportWidth }}
              >
                <CatalogLivePreview
                  store={store}
                  products={products}
                  exchangeRate={exchangeRate}
                  exchangeRateUpdatedAt={exchangeRateUpdatedAt}
                  settings={settings}
                />
              </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface CatalogPreviewTriggerProps {
  onClick: () => void;
  className?: string;
}

export function CatalogPreviewTrigger({ onClick, className }: CatalogPreviewTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        className,
      )}
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Vista previa</span>
    </button>
  );
}
