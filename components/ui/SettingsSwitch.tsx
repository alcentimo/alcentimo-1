interface SettingsSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function SettingsSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
}: SettingsSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`settings-toggle ${checked ? "settings-toggle-on" : ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className="settings-toggle-knob" aria-hidden="true" />
    </button>
  );
}
