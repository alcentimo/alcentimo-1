const STORAGE_PREFIX = "alcentimo-onboarding";

function buildKey(storeId: string, suffix: string): string {
  return `${STORAGE_PREFIX}:${storeId}:${suffix}`;
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function isOnboardingChecklistDismissed(storeId: string): boolean {
  return readFlag(buildKey(storeId, "checklist-dismissed"));
}

export function dismissOnboardingChecklist(storeId: string): void {
  writeFlag(buildKey(storeId, "checklist-dismissed"));
}

export function isShareLinkStepCompleted(storeId: string): boolean {
  return readFlag(buildKey(storeId, "share-completed"));
}

export function markShareLinkStepCompleted(storeId: string): void {
  writeFlag(buildKey(storeId, "share-completed"));
}

export function isWelcomeSeen(storeId: string): boolean {
  return readFlag(buildKey(storeId, "welcome-seen"));
}

export function markWelcomeSeen(storeId: string): void {
  writeFlag(buildKey(storeId, "welcome-seen"));
}
