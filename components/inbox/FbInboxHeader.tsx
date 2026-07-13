"use client";

import type { ReactNode } from "react";
import { ImmersiveModeToggle } from "@/components/inbox/ImmersiveModeToggle";

interface FbInboxHeaderProps {
  pendingCount?: number;
  children?: ReactNode;
}

export function FbInboxHeader({ pendingCount = 0, children }: FbInboxHeaderProps) {
  return (
    <header className="fb-inbox-header">
      <div className="flex min-w-0 items-center gap-2.5">
        <ImmersiveModeToggle />
        <h1 className="fb-inbox-title">Bandeja de Facebook</h1>
      </div>
      {pendingCount > 0 && (
        <span className="fb-inbox-pending-badge">
          {pendingCount} por responder
        </span>
      )}
      {children}
    </header>
  );
}
