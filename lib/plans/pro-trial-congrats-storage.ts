const STORAGE_KEY = "alcentimo:pro-trial-congrats";
export const PRO_TRIAL_CONGRATS_EVENT = "alcentimo:pro-trial-congrats";

export interface ProTrialCongratsPayload {
  endsAt: string | null;
  createdAt: number;
}

export function persistProTrialCongrats(endsAt: string | null): void {
  if (typeof window === "undefined") return;
  const payload: ProTrialCongratsPayload = {
    endsAt,
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(PRO_TRIAL_CONGRATS_EVENT));
}

export function readProTrialCongrats(): ProTrialCongratsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProTrialCongratsPayload;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      endsAt: typeof parsed.endsAt === "string" ? parsed.endsAt : null,
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearProTrialCongrats(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
