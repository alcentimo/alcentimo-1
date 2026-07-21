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

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getDismissStorageKey(storeSlug: string): string {
  return `alcentimo_pwa_install_dismiss_${storeSlug}`;
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

function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

function isBannerDismissed(storeSlug: string): boolean {
  if (typeof window === "undefined") return false;

  const raw = localStorage.getItem(getDismissStorageKey(storeSlug));
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return true;

  return Date.now() - dismissedAt < DISMISS_TTL_MS;
}

export function InstallPwaBanner({
  storeSlug,
  storeName,
  storeLogoUrl,
}: InstallPwaBannerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => getDeferredInstallPrompt());
  const [manualInstallMode, setManualInstallMode] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(getDismissStorageKey(storeSlug), String(Date.now()));
    setVisible(false);
  }, [storeSlug]);

  useEffect(() => {
    initBeforeInstallPromptCapture();

    if (isAppInstalled() || isBannerDismissed(storeSlug) || !isCatalogPath(storeSlug)) {
      return;
    }

    const ios = isIosDevice();
    setIosMode(ios);
    setVisible(true);

    const unsubscribe = subscribeToInstallPrompt((event) => {
      setDeferredPrompt(event);
      if (event) {
        setManualInstallMode(false);
        setIosMode(false);
      }
    });

    const manualTimer = window.setTimeout(() => {
      if (!getDeferredInstallPrompt()) {
        setManualInstallMode(true);
        if (ios) setExpanded(true);
      }
    }, 1200);

    return () => {
      unsubscribe();
      window.clearTimeout(manualTimer);
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
          setVisible(false);
        }
      } catch {
        setManualInstallMode(true);
        setExpanded(true);
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
      return;
    }

    setManualInstallMode(true);
    setExpanded(true);
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
    return (
      <>
        En Chrome o Edge: menú ⋮ → <strong>Instalar aplicación</strong> (también en PC)
      </>
    );
  }, [iosMode]);

  if (!visible || isAppInstalled()) {
    return null;
  }

  const displayName = storeName.trim() || "tu tienda";
  const installLabel = installing
    ? "Instalando…"
    : deferredPrompt
      ? "Instalar aplicación"
      : iosMode
        ? "Añadir a inicio"
        : "Instalar aplicación";

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
          <p className="install-pwa-banner-subtitle">Instala el catálogo en tu dispositivo</p>
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

      {expanded && (manualInstallMode || iosMode) && !deferredPrompt ? (
        <p className="install-pwa-banner-hint">{installHint}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="install-pwa-banner-toggle"
        aria-expanded={expanded}
        aria-label={expanded ? "Ocultar detalles" : "Ver cómo instalar"}
      >
        {expanded ? "Menos" : "Cómo"}
      </button>

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
