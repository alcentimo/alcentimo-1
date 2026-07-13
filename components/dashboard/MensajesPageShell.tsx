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
          ? "mensajes-page-shell flex h-full min-h-0 w-full max-w-none flex-col px-3 py-3"
          : "mensajes-page-shell mx-auto flex h-full min-h-0 w-full max-w-[100rem] flex-col px-4 py-4 lg:px-5 lg:py-5"
      }
    >
      {children}
    </div>
  );
}
