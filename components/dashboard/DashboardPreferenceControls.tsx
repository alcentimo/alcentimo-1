"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  useLocale,
  useUiTheme,
} from "@/components/providers/UiPreferencesProvider";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UI_LOCALE_OPTIONS, type UiTheme } from "@/lib/ui-preferences/storage";
import { cn } from "@/lib/cn";

interface DashboardPreferenceControlsProps {
  variant?: "compact" | "settings";
  className?: string;
}

export function DashboardPreferenceControls({
  variant = "compact",
  className,
}: DashboardPreferenceControlsProps) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme, resolvedTheme } = useUiTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center", className)}>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <div>
        <Label htmlFor="settings-theme" className="payment-field-label">
          {t("prefs.theme")}
        </Label>
        <Select
          id="settings-theme"
          value={mounted ? theme : "system"}
          onChange={(e) => setTheme(e.target.value as UiTheme)}
          className="payment-field-input mt-1.5"
        >
          <option value="light">{t("prefs.theme.light")}</option>
          <option value="dark">{t("prefs.theme.dark")}</option>
          <option value="system">{t("prefs.theme.system")}</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="settings-locale" className="payment-field-label">
          {t("prefs.language")}
        </Label>
        <Select
          id="settings-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value === "en" ? "en" : "es")}
          className="payment-field-input mt-1.5"
        >
          {UI_LOCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
