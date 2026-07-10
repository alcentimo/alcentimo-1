import type { ReactNode } from "react";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";

interface SettingsOptionCardProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
  children?: ReactNode;
}

export function SettingsOptionCard({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  saving = false,
  children,
}: SettingsOptionCardProps) {
  return (
    <article className="settings-option-card">
      <div className="settings-option-row">
        <div className="min-w-0 flex-1 pr-4">
          <label
            htmlFor={id}
            className="block text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {label}
          </label>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        <SettingsSwitch
          id={id}
          label={label}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>

      {saving && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <SavingHint visible />
        </div>
      )}

      {checked && children && (
        <div className="settings-option-fields">{children}</div>
      )}
    </article>
  );
}
