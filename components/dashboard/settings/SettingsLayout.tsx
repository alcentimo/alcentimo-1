import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "default" | "payments";
}

export function SettingsSection({
  title,
  description,
  children,
  variant = "default",
}: SettingsSectionProps) {
  return (
    <section className={variant === "payments" ? "payment-settings-section" : "settings-section"}>
      <header className="settings-section-header">
        <h2
          className={
            variant === "payments"
              ? "payment-settings-section-title"
              : "settings-section-title"
          }
        >
          {title}
        </h2>
        {description && (
          <p
            className={
              variant === "payments"
                ? "text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                : "text-sm text-zinc-500 dark:text-zinc-400"
            }
          >
            {description}
          </p>
        )}
      </header>
      <div className={variant === "payments" ? "payment-settings-section-body" : "settings-section-grid"}>
        {children}
      </div>
    </section>
  );
}

interface SettingsSaveBarProps {
  label: string;
  saving: boolean;
  onSave: () => void;
  hint?: string;
}

export function SettingsSaveBar({ label, saving, onSave, hint }: SettingsSaveBarProps) {
  return (
    <div className="settings-save-bar settings-save-bar--premium">
      <div className="min-w-0 flex-1">
        {hint ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>
        ) : (
          <SavingHint visible={saving} />
        )}
        {hint && saving ? (
          <div className="mt-2">
            <SavingHint visible />
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={cn(
          "btn-brand h-11 min-w-[11rem] px-6 text-sm font-semibold shadow-md",
          saving && "opacity-90",
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Guardando…
          </>
        ) : (
          label
        )}
      </Button>
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
  saveHint?: string;
}

export function SettingsTabShell({
  error,
  children,
  saveLabel = "Guardar cambios",
  saving = false,
  onSave,
  hideSaveBar = false,
  saveHint,
}: SettingsTabShellProps) {
  return (
    <div className="settings-tab-shell settings-tab-shell--with-save">
      {error && (
        <p className="settings-error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="settings-tab-content settings-tab-content--with-save">{children}</div>
      {!hideSaveBar && onSave && (
        <SettingsSaveBar
          label={saveLabel}
          saving={saving}
          onSave={onSave}
          hint={saveHint}
        />
      )}
    </div>
  );
}
