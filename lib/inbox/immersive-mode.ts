export const IMMERSIVE_MODE_STORAGE_KEY = "alcentimo-inbox-immersive-v1";

export function readImmersiveMode(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(IMMERSIVE_MODE_STORAGE_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

export function writeImmersiveMode(enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      IMMERSIVE_MODE_STORAGE_KEY,
      enabled ? "true" : "false",
    );
  } catch {
    // Ignore quota or privacy errors.
  }
}
