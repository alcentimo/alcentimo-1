"use client";

import { useState, useTransition } from "react";
import { DashboardPreferenceControls } from "@/components/dashboard/DashboardPreferenceControls";
import {
  SettingsSection,
} from "@/components/dashboard/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import {
  useLocale,
  useUiTheme,
} from "@/components/providers/UiPreferencesProvider";
import { saveInterfacePreferencesSettings } from "@/lib/settings/actions";

export function InterfacePreferencesSettingsSection() {
  const { t, locale } = useLocale();
  const { theme } = useUiTheme();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveInterfacePreferencesSettings({
        theme:
          theme === "light" || theme === "dark" || theme === "system"
            ? theme
            : "system",
        locale,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(t("prefs.saved"));
    });
  }

  return (
    <SettingsSection
      title={t("prefs.sectionTitle")}
      description={t("prefs.sectionDescription")}
      variant="payments"
    >
      <div className="general-settings-card space-y-4">
        <DashboardPreferenceControls variant="settings" />

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {success ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {success}
          </p>
        ) : null}

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? t("prefs.saving") : t("prefs.save")}
        </Button>
      </div>
    </SettingsSection>
  );
}
