"use client";

import { useEffect, useState } from "react";
import { getStoreOpenStatus } from "@/lib/store-settings/store-hours";
import type { LocationHoursSettings } from "@/lib/store-settings/types";
import { cn } from "@/lib/cn";

interface StoreOpenBadgeProps {
  locationHours: LocationHoursSettings;
  className?: string;
}

export function StoreOpenBadge({ locationHours, className }: StoreOpenBadgeProps) {
  const [status, setStatus] = useState(() => getStoreOpenStatus(locationHours));

  useEffect(() => {
    const refresh = () => setStatus(getStoreOpenStatus(locationHours));
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [locationHours]);

  return (
    <span
      className={cn(
        "txn-store-status",
        status.isOpen ? "txn-store-status-open" : "txn-store-status-closed",
        className,
      )}
      title={status.scheduleHint}
    >
      <span className="txn-store-status-dot" aria-hidden="true" />
      {status.label}
    </span>
  );
}
