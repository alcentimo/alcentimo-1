"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type SheetSide = "left" | "right" | "bottom";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Si es false, el overlay no bloquea clics en el contenido detrás. */
  modal?: boolean;
  /** Bloquear scroll del body mientras el panel está abierto. */
  lockScroll?: boolean;
  /** Alineación del panel en el viewport. Por defecto derecha. */
  side?: SheetSide;
  /** Clases extra en el contenedor del portal (p. ej. variantes responsivas). */
  className?: string;
  /**
   * Contenedor del portal. Si se pasa, el overlay se monta ahí con
   * `absolute` (útil para vistas previas / mockups). Por defecto `document.body`
   * con `fixed`.
   */
  container?: HTMLElement | null;
}

const SIDE_OVERLAY: Record<SheetSide, string> = {
  left: "justify-start",
  right: "justify-end",
  bottom: "items-end justify-center",
};

export function Sheet({
  open,
  onOpenChange,
  children,
  modal = true,
  lockScroll = true,
  side = "right",
  className,
  container = null,
}: SheetProps) {
  const contained = container != null;
  const shouldLockScroll = lockScroll && !contained;

  useEffect(() => {
    if (!open || !shouldLockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, shouldLockScroll]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  if (typeof document === "undefined") return null;

  const portalTarget = contained ? container : document.body;
  if (!portalTarget) return null;

  return createPortal(
    <div
      className={cn(
        contained ? "absolute inset-0 z-50 flex" : "fixed inset-0 z-50 flex",
        SIDE_OVERLAY[side],
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[1px]",
          !modal && "pointer-events-none bg-black/20 backdrop-blur-none",
        )}
        aria-label="Cerrar"
        aria-hidden={!modal}
        tabIndex={modal ? 0 : -1}
        onClick={modal ? () => onOpenChange(false) : undefined}
      />
      {children}
    </div>,
    portalTarget,
  );
}

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  side?: SheetSide;
  /**
   * Si es true, no aplica estilos de lado (útil cuando el layout
   * responsivo vive por completo en CSS, p. ej. filtros del catálogo).
   */
  unstyledSide?: boolean;
}

const SIDE_CONTENT: Record<SheetSide, string> = {
  left:
    "h-full w-full max-w-md border-r border-zinc-200 shadow-2xl dark:border-zinc-800",
  right:
    "h-full w-full max-w-md border-l border-zinc-200 shadow-2xl dark:border-zinc-800",
  bottom:
    "mt-auto h-auto max-h-[min(85dvh,40rem)] w-full max-w-none rounded-t-2xl border-t border-zinc-200 pb-[env(safe-area-inset-bottom,0px)] shadow-2xl dark:border-zinc-800",
};

export function SheetContent({
  children,
  className,
  onClose,
  side = "right",
  unstyledSide = false,
}: SheetContentProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex flex-col bg-white dark:bg-zinc-950",
        !unstyledSide && SIDE_CONTENT[side],
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function SheetHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-zinc-200 px-5 py-4 pr-12 dark:border-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-base font-semibold text-zinc-900 dark:text-zinc-50", className)}>
      {children}
    </h2>
  );
}

export function SheetDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-xs text-zinc-500 dark:text-zinc-400", className)}>{children}</p>
  );
}

export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)}>{children}</div>
  );
}
