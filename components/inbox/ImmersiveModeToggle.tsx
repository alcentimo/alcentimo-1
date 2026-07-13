"use client";

import { Menu, PanelLeftOpen } from "lucide-react";
import { useImmersiveMode } from "@/components/inbox/ImmersiveModeProvider";

interface ImmersiveModeToggleProps {
  className?: string;
}

export function ImmersiveModeToggle({ className = "" }: ImmersiveModeToggleProps) {
  const { isImmersive, toggleImmersive } = useImmersiveMode();

  return (
    <button
      type="button"
      onClick={toggleImmersive}
      className={`fb-inbox-immersive-toggle ${className}`}
      aria-label={
        isImmersive
          ? "Salir del modo inmersivo y mostrar menú"
          : "Activar modo inmersivo"
      }
      title={isImmersive ? "Mostrar menú" : "Modo inmersivo"}
    >
      {isImmersive ? (
        <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Menu className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
