"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
}: InstallPwaBannerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => getDeferredInstallPrompt());
  const [manualInstallMode, setManualInstallMode] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(getDismissStorageKey(storeSlug), String(Date.now()));
    setVisible(false);
  }, [storeSlug]);

  useEffect(() => {
    initBeforeInstallPromptCapture();

    if (isAppInstalled() || isBannerDismissed(storeSlug) || !isCatalogPath(storeSlug)) {
      return;
    }

    setVisible(true);

    const unsubscribe = subscribeToInstallPrompt((event) => {
      setDeferredPrompt(event);
      if (event) {
        setManualInstallMode(false);
      }
    });

    const manualTimer = window.setTimeout(() => {
      if (!getDeferredInstallPrompt()) {
        setManualInstallMode(true);
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

  if (!visible || isAppInstalled()) {
    return null;
  }

  const displayName = storeName.trim() || "tu tienda";
  const installLabel = installing
    ? "Instalando…"
    : deferredPrompt
      ? "Instalar"
      : "Instalar app";

  return (
    <div
      className={cn(
        "install-pwa-banner",
        expanded && "install-pwa-banner--expanded",
      )}
      role="region"
      aria-label="Instalar aplicación"
    >
      <button
        type="button"
        onClick={() => void handleInstallClick()}
        disabled={installing}
        className="install-pwa-banner-action"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {installLabel} {displayName}
      </button>

      {expanded && manualInstallMode && !deferredPrompt ? (
        <p className="install-pwa-banner-hint">
          En Chrome: menú ⋮ → <strong>Instalar aplicación</strong>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="install-pwa-banner-toggle"
        aria-expanded={expanded}
        aria-label={expanded ? "Ocultar detalles" : "Ver cómo instalar"}
      >
        {expanded ? "Menos" : "Más"}
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
