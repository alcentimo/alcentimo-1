"use client";

import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PanelLeft,
  UserRound,
} from "lucide-react";

interface InboxDockTabProps {
  side: "left" | "center" | "right";
  label: string;
  onExpand: () => void;
}

function TabIcon({ side }: { side: InboxDockTabProps["side"] }) {
  if (side === "left") {
    return <PanelLeft className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
  if (side === "right") {
    return <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
  return <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

function ExpandIcon({ side }: { side: InboxDockTabProps["side"] }) {
  if (side === "left") {
    return <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  if (side === "right") {
    return <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }
  return <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export function InboxDockTab({ side, label, onExpand }: InboxDockTabProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className={`inbox-dock-tab inbox-dock-tab--${side}`}
      title={`Mostrar ${label}`}
      aria-label={`Mostrar panel ${label}`}
    >
      <TabIcon side={side} />
      <span className="inbox-dock-tab-label">{label}</span>
      <ExpandIcon side={side} />
    </button>
  );
}
