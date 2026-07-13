"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Minus } from "lucide-react";

interface InboxDockPanelProps {
  title: string;
  side: "left" | "center" | "right";
  onCollapse: () => void;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

function CollapseIcon({ side }: { side: InboxDockPanelProps["side"] }) {
  if (side === "left") {
    return <ChevronLeft className="h-4 w-4" aria-hidden="true" />;
  }
  if (side === "right") {
    return <ChevronRight className="h-4 w-4" aria-hidden="true" />;
  }
  return <Minus className="h-4 w-4" aria-hidden="true" />;
}

export function InboxDockPanel({
  title,
  side,
  onCollapse,
  children,
  className = "",
  headerExtra,
}: InboxDockPanelProps) {
  return (
    <div className={`inbox-dock-panel inbox-dock-panel--${side} ${className}`}>
      <header className="inbox-dock-panel-header">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {title}
          </h2>
          {headerExtra}
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="inbox-dock-collapse-btn"
          title={`Ocultar ${title.toLowerCase()}`}
          aria-label={`Ocultar panel ${title}`}
        >
          <CollapseIcon side={side} />
        </button>
      </header>
      <div className="inbox-dock-panel-body">{children}</div>
    </div>
  );
}
