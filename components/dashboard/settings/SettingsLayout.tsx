import type { ReactNode } from "react";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </header>
      <div className="settings-section-grid">{children}</div>
    </section>
  );
}

interface SettingsSaveBarProps {
  label: string;
  saving: boolean;
  onSave: () => void;
}

export function SettingsSaveBar({ label, saving, onSave }: SettingsSaveBarProps) {
  return (
    <div className="settings-save-bar">
      <SavingHint visible={saving} />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="btn-brand min-w-[9rem] shadow-sm disabled:opacity-60"
      >
        {saving ? "Guardando…" : label}
      </button>
    </div>
  );
}

interface SettingsTabShellProps {
  error?: string | null;
  children: ReactNode;
  saveLabel?: string;
  saving?: boolean;
  onSave?: () => void;
  hideSaveBar?: boolean;
}

export function SettingsTabShell({
  error,
  children,
  saveLabel = "Guardar cambios",
  saving = false,
  onSave,
  hideSaveBar = false,
}: SettingsTabShellProps) {
  return (
    <div className="settings-tab-shell">
      {error && (
        <p className="settings-error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="settings-tab-content">{children}</div>
      {!hideSaveBar && onSave && (
        <SettingsSaveBar label={saveLabel} saving={saving} onSave={onSave} />
      )}
    </div>
  );
}
