"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { appendInboxConversationActivity } from "@/lib/inbox/actions";
import { isPersistedConversation } from "@/lib/inbox/contact-context";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";

interface ScheduleFollowUpButtonProps {
  conversationId: string;
  disabled?: boolean;
  onScheduled?: (event: ClientActivityEvent) => void;
}

const QUICK_OPTIONS = [
  { id: "tomorrow", label: "Mañana", days: 1 },
  { id: "three-days", label: "En 3 días", days: 3 },
  { id: "week", label: "En 1 semana", days: 7 },
] as const;

function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
}

function formatFollowUpLabel(date: Date): string {
  return `Seguimiento · ${date.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function ScheduleFollowUpButton({
  conversationId,
  disabled = false,
  onScheduled,
}: ScheduleFollowUpButtonProps) {
  const [open, setOpen] = useState(false);
  const [isScheduling, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function scheduleFollowUp(date: Date) {
    const label = formatFollowUpLabel(date);
    const event: ClientActivityEvent = {
      id: `follow-up-local-${Date.now()}`,
      label,
      createdAt: new Date().toISOString(),
    };

    onScheduled?.(event);
    setOpen(false);

    if (!isPersistedConversation(conversationId)) return;

    startTransition(async () => {
      const result = await appendInboxConversationActivity(
        conversationId,
        label,
        "follow_up",
      );
      if (result.error) {
        console.error("[ScheduleFollowUpButton]", result.error);
      }
    });
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || isScheduling}
        onClick={() => setOpen((current) => !current)}
        className="inbox-follow-up-btn"
        title="Programar seguimiento"
        aria-label="Programar seguimiento"
        aria-expanded={open}
      >
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div className="inbox-follow-up-menu" role="menu">
          <p className="inbox-follow-up-menu-title">Programar seguimiento</p>
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => scheduleFollowUp(addDays(option.days))}
              className="inbox-follow-up-menu-item"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
