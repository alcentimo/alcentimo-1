export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallPromptListener = (event: BeforeInstallPromptEvent | null) => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<InstallPromptListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener(deferredPrompt);
  }
}

/** Captura beforeinstallprompt lo antes posible (no perder el evento antes de React). */
export function initBeforeInstallPromptCapture(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function subscribeToInstallPrompt(listener: InstallPromptListener): () => void {
  listeners.add(listener);
  listener(deferredPrompt);

  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  initBeforeInstallPromptCapture();
}
