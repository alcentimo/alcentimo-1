"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  containerClassName?: string;
}

export function Dialog({ open, onOpenChange, children, containerClassName }: DialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn("relative z-10 w-full max-w-lg", containerClassName)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogContent({ children, className, onClose }: DialogContentProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 pr-6", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-base font-semibold text-zinc-900 dark:text-zinc-50", className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-1 text-sm text-zinc-500 dark:text-zinc-400", className)}>{children}</p>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}
