/**
 * Meta Pixel (Conjunto de datos) — tracking de visitas y conversiones.
 * ID fijo del pixel de Alcéntimo.
 */
export const META_PIXEL_ID = "2966164503744998" as const;

export const META_PIXEL_SCRIPT = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
`.trim();

type FbqCommand = "init" | "track" | "trackCustom" | "consent";

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: FbqFunction;
}

declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

function getFbq(): FbqFunction | null {
  if (typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

/** Dispara un evento estándar del Píxel de Meta (p. ej. CompleteRegistration). */
export function trackMetaPixelEvent(
  eventName: string,
  params?: Record<string, unknown>,
): boolean {
  const fbq = getFbq();
  if (!fbq) return false;

  try {
    if (params && Object.keys(params).length > 0) {
      fbq("track" satisfies FbqCommand, eventName, params);
    } else {
      fbq("track" satisfies FbqCommand, eventName);
    }
    return true;
  } catch {
    return false;
  }
}

export function trackMetaCompleteRegistration(
  params?: Record<string, unknown>,
): boolean {
  return trackMetaPixelEvent("CompleteRegistration", params);
}

const COMPLETE_REGISTRATION_STORAGE_KEY =
  "alcentimo:meta-complete-registration";

export function hasTrackedMetaCompleteRegistration(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COMPLETE_REGISTRATION_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markMetaCompleteRegistrationTracked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPLETE_REGISTRATION_STORAGE_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Dispara CompleteRegistration una sola vez por navegador
 * (primer ingreso al panel tras completar el alta).
 * Reintenta brevemente si el script del píxel aún no cargó.
 */
export function trackMetaCompleteRegistrationOnce(
  params?: Record<string, unknown>,
): boolean {
  if (hasTrackedMetaCompleteRegistration()) return false;

  const attempt = (): boolean => {
    const ok = trackMetaCompleteRegistration(params);
    if (ok) {
      markMetaCompleteRegistrationTracked();
    }
    return ok;
  };

  if (attempt()) return true;

  if (typeof window === "undefined") return false;

  // El bootstrap de fbq suele estar listo en afterInteractive; reintentar un momento.
  const startedAt = Date.now();
  const intervalId = window.setInterval(() => {
    if (attempt() || Date.now() - startedAt > 4_000) {
      window.clearInterval(intervalId);
    }
  }, 200);

  return false;
}
