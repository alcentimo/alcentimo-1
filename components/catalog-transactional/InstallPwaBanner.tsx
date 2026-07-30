"use client";

import { Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  getDeferredInstallPrompt,
  initBeforeInstallPromptCapture,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/before-install-prompt";
import { parseStoreSlugFromHost } from "@/lib/store-host";

interface InstallPwaBannerProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
}

/** Preferencia de cierre solo para esta pestaña/sesión. */
function getSessionDismissKey(storeSlug: string): string {
  return `alcentimo_pwa_install_dismiss_session_${storeSlug}`;
}

function isCatalogPath(storeSlug: string): boolean {
  if (typeof window === "undefined") return false;
  const slug = storeSlug.trim().toLowerCase();
  const slugFromHost = parseStoreSlugFromHost(window.location.host);
  if (slugFromHost === slug) return true;
  return window.location.pathname.startsWith(`/c/${slug}`);
}

function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches;

  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return standalone || iosStandalone;
}

function isFirefoxBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // Firefox / Firefox iOS — sin beforeinstallprompt ni flujo A2HS fiable como Safari.
  return /firefox\/\d/i.test(ua) || /fxios\/\d/i.test(ua);
}

/** iPhone/iPad con Safari (Add to Home Screen). */
function isIosSafariInstallable(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  // Excluir Chrome/Firefox/Edge en iOS: el banner nativo no aplica igual.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

function isSessionDismissed(storeSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(getSessionDismissKey(storeSlug)) === "1";
  } catch {
    return false;
  }
}

function markSessionDismissed(storeSlug: string): void {
  try {
    sessionStorage.setItem(getSessionDismissKey(storeSlug), "1");
  } catch {
    // Private mode / blocked storage: igual ocultamos en memoria.
  }
}

/**
 * Banner de instalación PWA solo cuando el navegador puede instalar de verdad:
 * - Chromium con `beforeinstallprompt`
 * - iOS Safari (Añadir a pantalla de inicio)
 * Oculto en Firefox, escritorio sin soporte, o ya instalado.
 */
export function InstallPwaBanner({
  storeSlug,
  storeName,
  storeLogoUrl,
}: InstallPwaBannerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => getDeferredInstallPrompt());
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  const dismissBanner = useCallback(() => {
    markSessionDismissed(storeSlug);
    setVisible(false);
  }, [storeSlug]);

  useEffect(() => {
    initBeforeInstallPromptCapture();

    if (
      isAppInstalled() ||
      isSessionDismissed(storeSlug) ||
      !isCatalogPath(storeSlug) ||
      isFirefoxBrowser()
    ) {
      setVisible(false);
      return;
    }

    const iosSafari = isIosSafariInstallable();
    if (iosSafari) {
      setIosMode(true);
      setVisible(true);
      setExpanded(true);
      return;
    }

    // Chromium u otros: solo mostrar si llega (o ya hay) beforeinstallprompt.
    const existing = getDeferredInstallPrompt();
    if (existing) {
      setDeferredPrompt(existing);
      setIosMode(false);
      setVisible(true);
    }

    const unsubscribe = subscribeToInstallPrompt((event) => {
      if (isSessionDismissed(storeSlug) || isAppInstalled()) {
        setVisible(false);
        return;
      }
      setDeferredPrompt(event);
      if (event) {
        setIosMode(false);
        setVisible(true);
      }
    });

    // Si tras un rato no hay prompt, no mostrar banner inútil (Firefox ya excluido;
    // desktop Edge/Chrome sin criterios PWA, etc.).
    const hideTimer = window.setTimeout(() => {
      if (!getDeferredInstallPrompt() && !isIosSafariInstallable()) {
        setVisible(false);
      }
    }, 2500);

    return () => {
      unsubscribe();
      window.clearTimeout(hideTimer);
    };
  }, [storeSlug]);

  async function handleInstallClick() {
    const promptEvent = deferredPrompt ?? getDeferredInstallPrompt();

    if (promptEvent) {
      setInstalling(true);

      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;

        if (outcome === "accepted") {
          markSessionDismissed(storeSlug);
          setVisible(false);
        }
      } catch {
        // Si el prompt falla, no insistir con instrucciones genéricas en navegadores
        // sin soporte: ocultar.
        setVisible(false);
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
      return;
    }

    if (iosMode) {
      setExpanded(true);
      return;
    }

    setVisible(false);
  }

  const installHint = useMemo(() => {
    if (iosMode) {
      return (
        <>
          En iPhone/iPad: toca <Share className="inline h-3 w-3" aria-hidden="true" />{" "}
          <strong>Compartir</strong> → <strong>Añadir a pantalla de inicio</strong>
        </>
      );
    }
    return null;
  }, [iosMode]);

  if (!visible || isAppInstalled()) {
    return null;
  }

  // Defensa extra: sin prompt nativo y sin iOS Safari → no renderizar.
  if (!deferredPrompt && !iosMode) {
    return null;
  }

  const displayName = storeName.trim() || "tu tienda";
  const installLabel = installing
    ? "Instalando…"
    : deferredPrompt
      ? "Instalar aplicación"
      : "Añadir a inicio";

  return (
    <div
      className={cn(
        "install-pwa-banner",
        expanded && "install-pwa-banner--expanded",
      )}
      role="region"
      aria-label="Instalar aplicación"
    >
      <div className="install-pwa-banner-brand">
        {storeLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={storeLogoUrl}
            alt=""
            width={28}
            height={28}
            className="install-pwa-banner-logo"
          />
        ) : (
          <span className="install-pwa-banner-logo-fallback" aria-hidden="true">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="install-pwa-banner-title">{displayName}</p>
          <p className="install-pwa-banner-subtitle">
            Instala el catálogo en tu dispositivo
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleInstallClick()}
        disabled={installing}
        className="install-pwa-banner-action"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {installLabel}
      </button>

      {expanded && iosMode && installHint ? (
        <p className="install-pwa-banner-hint">{installHint}</p>
      ) : null}

      {iosMode ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="install-pwa-banner-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Ocultar detalles" : "Ver cómo instalar"}
        >
          {expanded ? "Menos" : "Cómo"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={dismissBanner}
        className="install-pwa-banner-dismiss"
        aria-label="Cerrar aviso de instalación"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
