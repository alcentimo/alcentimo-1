"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateOrderEstado } from "@/lib/orders/update-order-estado";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";
import { OrderEstadoPill } from "@/components/dashboard/orders/OrderEstadoPill";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ORDER_ESTADO_HINTS,
  ORDER_ESTADO_LABELS,
  ORDER_ESTADOS,
  isValidOrderEstado,
  type OrderEstado,
} from "@/lib/orders/order-status";

interface OrderStatusSelectProps {
  orderId: string;
  estado: OrderEstado;
  trackingNumber?: string | null;
  onEstadoUpdated?: (
    orderId: string,
    estado: OrderEstado,
    context?: {
      previousEstado: OrderEstado;
      trackingNumber?: string | null;
    },
  ) => void;
  className?: string;
  align?: "start" | "end";
}

const COMPACT_MQ = "(max-width: 767px)";
const MENU_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;
const MENU_WIDTH_PX = 248;

type MenuCoords = {
  top: number;
  left: number;
  width: number;
};

function computeMenuCoords(
  triggerRect: DOMRect,
  menuHeight: number,
  align: "start" | "end",
): MenuCoords {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(MENU_WIDTH_PX, viewportWidth - VIEWPORT_PAD_PX * 2);

  const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PAD_PX;
  const spaceAbove = triggerRect.top - VIEWPORT_PAD_PX;
  const placeBelow =
    spaceBelow >= menuHeight + MENU_GAP_PX || spaceBelow >= spaceAbove;

  let top = placeBelow
    ? triggerRect.bottom + MENU_GAP_PX
    : triggerRect.top - menuHeight - MENU_GAP_PX;

  top = Math.min(
    Math.max(top, VIEWPORT_PAD_PX),
    Math.max(VIEWPORT_PAD_PX, viewportHeight - menuHeight - VIEWPORT_PAD_PX),
  );

  let left =
    align === "end" ? triggerRect.right - width : triggerRect.left;
  left = Math.min(
    Math.max(left, VIEWPORT_PAD_PX),
    Math.max(VIEWPORT_PAD_PX, viewportWidth - width - VIEWPORT_PAD_PX),
  );

  return { top, left, width };
}

export function OrderStatusSelect({
  orderId,
  estado,
  trackingNumber = null,
  onEstadoUpdated,
  className,
  align = "start",
}: OrderStatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [currentEstado, setCurrentEstado] = useState(estado);
  const [currentTracking, setCurrentTracking] = useState(trackingNumber ?? "");
  const [guideDraft, setGuideDraft] = useState(trackingNumber ?? "");
  const [awaitingGuide, setAwaitingGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(COMPACT_MQ).matches
      : false,
  );
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);

  const menuOpen = open || awaitingGuide;

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(COMPACT_MQ);
    const sync = () => {
      setCompact(media.matches);
      if (!media.matches) return;
      // Compact layout uses the sheet; clear anchored coords.
      setCoords(null);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setCurrentEstado(estado);
  }, [estado]);

  useEffect(() => {
    setCurrentTracking(trackingNumber ?? "");
    setGuideDraft(trackingNumber ?? "");
  }, [trackingNumber]);

  useLayoutEffect(() => {
    if (compact || !menuOpen) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const triggerEl = triggerRef.current;
      const menuEl = portalMenuRef.current;
      if (!triggerEl || !menuEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();
      setCoords(
        computeMenuCoords(
          triggerRect,
          Math.max(menuRect.height, 1),
          align,
        ),
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [compact, menuOpen, align, open, awaitingGuide]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (portalMenuRef.current?.contains(target)) return;
      // Sheet portal content is outside root; ignore while compact sheet handles dismiss.
      if (compact) return;
      setOpen(false);
      setAwaitingGuide(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setAwaitingGuide(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, compact]);

  function closeMenus() {
    setOpen(false);
    setAwaitingGuide(false);
  }

  function applyEstado(nextEstado: OrderEstado, nextTracking?: string | null) {
    if (nextEstado === currentEstado && nextTracking === undefined) {
      closeMenus();
      return;
    }

    const previous = currentEstado;
    const previousTracking = currentTracking;
    setError(null);
    setCurrentEstado(nextEstado);
    if (nextTracking !== undefined) {
      setCurrentTracking(nextTracking ?? "");
    }
    closeMenus();

    startTransition(async () => {
      const result = await updateOrderEstado(orderId, nextEstado, {
        trackingNumber:
          nextEstado === "enviado" ? (nextTracking ?? null) : undefined,
      });

      if (result.error) {
        setError(result.error);
        setCurrentEstado(previous);
        setCurrentTracking(previousTracking);
        return;
      }

      requestDashboardShellRefresh();
      onEstadoUpdated?.(orderId, nextEstado, {
        previousEstado: previous,
        trackingNumber:
          nextEstado === "enviado"
            ? (result.trackingNumber ?? nextTracking ?? null)
            : undefined,
      });
    });
  }

  function handleSelect(nextEstado: OrderEstado) {
    if (pending) return;

    if (nextEstado === "enviado") {
      setGuideDraft(currentTracking);
      setAwaitingGuide(true);
      setOpen(false);
      return;
    }

    applyEstado(nextEstado);
  }

  const statusOptions = (
    <div role="listbox" aria-label="Estados del pedido" className="min-w-0">
      {ORDER_ESTADOS.map((option) => {
        const isSelected = option === currentEstado;

        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              if (isValidOrderEstado(option)) handleSelect(option);
            }}
            className={cn(
              "orders-status-menu-item flex w-full items-start gap-2 px-2.5 py-2.5 text-left transition-colors",
              isSelected && "orders-status-menu-item-active",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <OrderEstadoPill estado={option} />
                {isSelected ? (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : null}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                {ORDER_ESTADO_HINTS[option]}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const guideForm = (
    <div
      className="space-y-3"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
        <Truck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        Marcar como enviado
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          Número de guía (opcional)
        </span>
        <input
          type="text"
          value={guideDraft}
          onChange={(event) => setGuideDraft(event.target.value)}
          placeholder="Ej. MRW-123456"
          autoFocus={!compact}
          className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none ring-violet-500/30 placeholder:text-zinc-400 focus:border-violet-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          onClick={() => applyEstado("enviado", guideDraft.trim() || null)}
        >
          Confirmar envío
        </button>
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          onClick={() => applyEstado("enviado", null)}
        >
          Sin guía
        </button>
      </div>
    </div>
  );

  const portalStyle: CSSProperties | undefined = coords
    ? {
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 90,
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        width: MENU_WIDTH_PX,
        zIndex: 90,
        visibility: "hidden",
      };

  let desktopPortal: ReactNode = null;
  if (mounted && !compact && open) {
    desktopPortal = createPortal(
      <div
        ref={portalMenuRef}
        className="orders-status-menu orders-status-menu--portal"
        style={portalStyle}
      >
        {statusOptions}
      </div>,
      document.body,
    );
  } else if (mounted && !compact && awaitingGuide) {
    desktopPortal = createPortal(
      <div
        ref={portalMenuRef}
        className="orders-status-menu orders-status-menu--portal space-y-2 p-3"
        style={portalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        {guideForm}
      </div>,
      document.body,
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-flex max-w-full flex-col gap-1", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        aria-haspopup={compact ? "dialog" : "listbox"}
        aria-expanded={menuOpen}
        aria-label={`Estado del pedido: ${ORDER_ESTADO_LABELS[currentEstado]}. Cambiar estado`}
        onClick={(event) => {
          event.stopPropagation();
          if (pending) return;
          if (awaitingGuide) {
            setAwaitingGuide(false);
            return;
          }
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex min-h-8 max-w-full items-center rounded-full transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          pending && "cursor-wait opacity-70",
        )}
      >
        <OrderEstadoPill estado={currentEstado} showChevron />
        {pending ? (
          <Loader2
            className="ml-1 h-3 w-3 shrink-0 animate-spin text-zinc-500"
            aria-hidden="true"
          />
        ) : null}
      </button>

      {currentEstado === "enviado" && currentTracking.trim() ? (
        <span className="max-w-[14rem] truncate text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
          Guía: {currentTracking.trim()}
        </span>
      ) : null}

      {desktopPortal}

      {compact ? (
        <Sheet
          open={menuOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeMenus();
          }}
          side="bottom"
          className="z-[90]"
        >
          <SheetContent
            side="bottom"
            className="orders-status-sheet"
            onClose={closeMenus}
          >
            {awaitingGuide ? (
              <>
                <SheetHeader className="pr-12">
                  <SheetTitle>Marcar como enviado</SheetTitle>
                  <SheetDescription>
                    Puedes agregar el número de guía ahora o más tarde.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="px-4 pb-5 pt-3">{guideForm}</SheetBody>
              </>
            ) : (
              <>
                <SheetHeader className="pr-12">
                  <SheetTitle>Estado del pedido</SheetTitle>
                  <SheetDescription>
                    Elige el nuevo estado. Quedará visible por encima de la lista.
                  </SheetDescription>
                </SheetHeader>
                <SheetBody className="orders-status-sheet-body">
                  {statusOptions}
                </SheetBody>
              </>
            )}
          </SheetContent>
        </Sheet>
      ) : null}

      {error ? (
        <span className="max-w-[14rem] text-[10px] leading-tight text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
