/**
 * Meta Pixel (Conjunto de datos) — tracking de visitas y conversiones.
 * ID fijo del pixel de Alcéntimo (sin espacios ni guiones).
 */
export const META_PIXEL_ID = "2966164503744998" as const;

/**
 * Bootstrap oficial de Meta, endurecido para App Router:
 * - Define `window.fbq` de inmediato (cola de eventos).
 * - Carga `fbevents.js` de forma asíncrona.
 * - Hace append seguro si aún no hay `<script>` en el documento.
 */
export const META_PIXEL_BOOTSTRAP_SCRIPT = `
(function(){
  if (typeof window === 'undefined') return;
  var f = window;
  var b = document;
  var e = 'script';
  var v = 'https://connect.facebook.net/en_US/fbevents.js';
  if (f.fbq) return;
  var n = f.fbq = function(){
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  var t = b.createElement(e);
  t.async = true;
  t.src = v;
  var s = b.getElementsByTagName(e)[0];
  if (s && s.parentNode) {
    s.parentNode.insertBefore(t, s);
  } else {
    (b.head || b.body || b.documentElement).appendChild(t);
  }
  f.fbq('init', '${META_PIXEL_ID}');
  f.fbq('track', 'PageView');
})();
`.trim();

type FbqCommand = "init" | "track" | "trackCustom" | "consent";

export interface FbqFunction {
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

/** Devuelve fbq solo en cliente cuando ya está definido globalmente. */
export function getFbq(): FbqFunction | null {
  if (typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

/** True cuando `window.fbq` está listo para recibir track(). */
export function isMetaPixelReady(): boolean {
  return getFbq() !== null;
}

/** Dispara un evento estándar del Píxel de Meta (p. ej. PageView, CompleteRegistration). */
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

export function trackMetaPageView(): boolean {
  return trackMetaPixelEvent("PageView");
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
 * Dispara CompleteRegistration una sola vez por navegador.
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

  const startedAt = Date.now();
  const intervalId = window.setInterval(() => {
    if (attempt() || Date.now() - startedAt > 5_000) {
      window.clearInterval(intervalId);
    }
  }, 200);

  return false;
}

/** @deprecated Usar META_PIXEL_BOOTSTRAP_SCRIPT */
export const META_PIXEL_SCRIPT = META_PIXEL_BOOTSTRAP_SCRIPT;
