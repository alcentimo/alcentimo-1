"use client";

import type { ReactNode } from "react";
import { useImmersiveMode } from "@/components/inbox/ImmersiveModeProvider";

interface MensajesPageShellProps {
  children: ReactNode;
}

export function MensajesPageShell({ children }: MensajesPageShellProps) {
  const { isImmersive } = useImmersiveMode();

  return (
    <div
      className={
        isImmersive
          ? "fb-inbox-shell mensajes-page-shell flex h-full min-h-0 w-full max-w-none flex-col px-2 py-2 sm:px-3 sm:py-3"
          : "fb-inbox-shell mensajes-page-shell mx-auto flex h-full min-h-0 w-full max-w-[92rem] flex-col px-0 py-4 sm:py-5"
      }
    >
      {children}
    </div>
  );
}
