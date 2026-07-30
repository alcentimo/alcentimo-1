"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const MENU_GAP_PX = 4;
const VIEWPORT_PAD_PX = 8;

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
}

type MenuPlacement = {
  top: number;
  left: number;
  minWidth: number;
  placement: "top" | "bottom";
};

function computeMenuPlacement(
  triggerRect: DOMRect,
  menuWidth: number,
  menuHeight: number,
  align: "start" | "end",
): MenuPlacement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PAD_PX;
  const spaceAbove = triggerRect.top - VIEWPORT_PAD_PX;

  const preferBottom = spaceBelow >= menuHeight + MENU_GAP_PX;
  const preferTop = !preferBottom && spaceAbove >= menuHeight + MENU_GAP_PX;
  const placement: "top" | "bottom" =
    preferBottom || (!preferTop && spaceBelow >= spaceAbove) ? "bottom" : "top";

  let top =
    placement === "bottom"
      ? triggerRect.bottom + MENU_GAP_PX
      : triggerRect.top - menuHeight - MENU_GAP_PX;

  top = Math.min(
    Math.max(top, VIEWPORT_PAD_PX),
    Math.max(VIEWPORT_PAD_PX, viewportHeight - menuHeight - VIEWPORT_PAD_PX),
  );

  let left =
    align === "end" ? triggerRect.right - menuWidth : triggerRect.left;
  left = Math.min(
    Math.max(left, VIEWPORT_PAD_PX),
    Math.max(VIEWPORT_PAD_PX, viewportWidth - menuWidth - VIEWPORT_PAD_PX),
  );

  return {
    top,
    left,
    minWidth: Math.max(menuWidth, triggerRect.width),
    placement,
  };
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
  menuClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<MenuPlacement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;
      if (!triggerEl || !menuEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();
      setCoords(
        computeMenuPlacement(
          triggerRect,
          Math.max(menuRect.width, 160),
          menuRect.height,
          align,
        ),
      );
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    // Capture scroll from nested overflow containers (tabla, main, etc.).
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuStyle: CSSProperties | undefined = coords
    ? {
        position: "fixed",
        top: coords.top,
        left: coords.left,
        minWidth: coords.minWidth,
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        visibility: "hidden",
      };

  const menu = open ? (
    <div
      ref={menuRef}
      className={cn(
        "z-[80] min-w-[10rem] rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950",
        menuClassName,
      )}
      style={menuStyle}
      role="menu"
    >
      {typeof children === "function"
        ? (children as (close: () => void) => ReactNode)(() => setOpen(false))
        : children}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <div
        ref={triggerRef}
        className="w-full"
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </div>
      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function DropdownMenuItem({
  children,
  onClick,
  destructive = false,
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
        destructive
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}
