"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  useLocale,
  useUiTheme,
} from "@/components/providers/UiPreferencesProvider";
import { cn } from "@/lib/cn";

interface DashboardPreferenceControlsProps {
  className?: string;
}

export function DashboardPreferenceControls({
  className,
}: DashboardPreferenceControlsProps) {
  const { t } = useLocale();
  const { setTheme, resolvedTheme } = useUiTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center", className)}>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-label={
          isDark ? t("prefs.theme.toggleToLight") : t("prefs.theme.toggleToDark")
        }
        title={
          isDark ? t("prefs.theme.toggleToLight") : t("prefs.theme.toggleToDark")
        }
      >
        {isDark ? (
          <Sun className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Moon className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
