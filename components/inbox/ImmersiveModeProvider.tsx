"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readImmersiveMode,
  writeImmersiveMode,
} from "@/lib/inbox/immersive-mode";

interface ImmersiveModeContextValue {
  isImmersive: boolean;
  hydrated: boolean;
  toggleImmersive: () => void;
  setImmersive: (enabled: boolean) => void;
}

const ImmersiveModeContext = createContext<ImmersiveModeContextValue | null>(
  null,
);

export function ImmersiveModeProvider({ children }: { children: ReactNode }) {
  const [isImmersive, setIsImmersive] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIsImmersive(readImmersiveMode());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeImmersiveMode(isImmersive);
  }, [hydrated, isImmersive]);

  const toggleImmersive = useCallback(() => {
    setIsImmersive((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      isImmersive,
      hydrated,
      toggleImmersive,
      setImmersive: setIsImmersive,
    }),
    [isImmersive, hydrated, toggleImmersive],
  );

  return (
    <ImmersiveModeContext.Provider value={value}>
      {children}
    </ImmersiveModeContext.Provider>
  );
}

export function useImmersiveMode(): ImmersiveModeContextValue {
  const context = useContext(ImmersiveModeContext);

  if (!context) {
    throw new Error("useImmersiveMode must be used within ImmersiveModeProvider");
  }

  return context;
}
