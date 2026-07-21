"use client";

import { memo, useEffect, useState } from "react";
import { GripVertical, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface InventoryProductOrderCellProps {
  productId: string;
  position: number;
  total: number;
  disabled?: boolean;
  pending?: boolean;
  onPositionCommit: (productId: string, nextPosition: number) => void;
}

export const InventoryProductOrderCell = memo(function InventoryProductOrderCell({
  productId,
  position,
  total,
  disabled = false,
  pending = false,
  onPositionCommit,
}: InventoryProductOrderCellProps) {
  const [draftPosition, setDraftPosition] = useState(String(position + 1));

  useEffect(() => {
    setDraftPosition(String(position + 1));
  }, [position]);

  function commitDraft() {
    const parsed = parseInt(draftPosition, 10);
    if (!Number.isFinite(parsed)) {
      setDraftPosition(String(position + 1));
      return;
    }
    onPositionCommit(productId, parsed);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        draggable={!disabled && !pending}
        disabled={disabled || pending}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-transparent text-zinc-400 transition hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200",
        )}
        aria-label="Arrastrar para reordenar"
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", productId);
        }}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="relative w-14">
        <Input
          type="number"
          min={1}
          max={total}
          step={1}
          value={draftPosition}
          disabled={disabled || pending}
          onChange={(event) => setDraftPosition(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 px-2 text-center text-xs tabular-nums"
          aria-label="Posición en catálogo"
        />
        {pending && (
          <Loader2
            className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-zinc-400"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
});

export function reorderProductIds(
  orderedIds: string[],
  productId: string,
  targetIndex: number,
): string[] {
  const fromIndex = orderedIds.indexOf(productId);
  if (fromIndex < 0) return orderedIds;

  const clampedIndex = Math.min(Math.max(targetIndex, 0), orderedIds.length - 1);
  if (fromIndex === clampedIndex) return orderedIds;

  const next = [...orderedIds];
  next.splice(fromIndex, 1);
  next.splice(clampedIndex, 0, productId);
  return next;
}
