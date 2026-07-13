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
          ? "w-full max-w-none px-2 py-2 sm:px-3 sm:py-3"
          : "mx-auto w-full max-w-[92rem] px-0 py-4 sm:py-5"
      }
    >
      {children}
    </div>
  );
}
