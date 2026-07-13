"use client";

import { formatMessageTime } from "@/lib/inbox/get-store-messages";
import type { ClientActivityEvent } from "@/lib/inbox/contact-crm";

interface ClientActivityListProps {
  events: ClientActivityEvent[];
}

export function ClientActivityList({ events }: ClientActivityListProps) {
  if (events.length === 0) {
    return <p className="inbox-context-module-empty">Sin actividad reciente.</p>;
  }

  return (
    <ul className="inbox-activity-list">
      {events.map((event) => (
        <li key={`${event.id}-${event.createdAt}`} className="inbox-activity-item">
          <span className="inbox-activity-dot" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="inbox-activity-label">{event.label}</span>
            <span className="inbox-activity-time">
              {formatMessageTime(event.createdAt)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
