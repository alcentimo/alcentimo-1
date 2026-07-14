"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>,
    document.body,
  );
}

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function SheetContent({ children, className, onClose }: SheetContentProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
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
