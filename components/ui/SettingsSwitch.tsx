interface SettingsSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: "default" | "sm";
}

export function SettingsSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  size = "default",
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
      className={`settings-toggle ${checked ? "settings-toggle-on" : ""} ${
        size === "sm" ? "h-5 w-9" : ""
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span
        className={`settings-toggle-knob ${
          size === "sm" ? "h-3.5 w-3.5" : ""
        } ${size === "sm" && checked ? "!translate-x-4" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}
