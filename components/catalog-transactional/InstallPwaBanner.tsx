"use client";

import Image from "next/image";
import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaBannerProps {
  storeSlug: string;
  storeName: string;
  storeLogoUrl: string | null;
}

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getDismissStorageKey(storeSlug: string): string {
  return `alcentimo_pwa_install_dismiss_${storeSlug}`;
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

function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function InstallPwaBanner({
  storeSlug,
  storeName,
  storeLogoUrl,
}: InstallPwaBannerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(getDismissStorageKey(storeSlug), String(Date.now()));
    setVisible(false);
  }, [storeSlug]);

  useEffect(() => {
    if (isAppInstalled() || isBannerDismissed(storeSlug)) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [storeSlug]);

  async function handleInstallClick() {
    if (!deferredPrompt) return;

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setVisible(false);
      }
    } catch {
      // El navegador puede rechazar prompt si no hay gesto válido.
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }

  if (!visible || !deferredPrompt || isAppInstalled()) {
    return null;
  }

  const displayName = storeName.trim() || "tu tienda";

  return (
    <div className="install-pwa-banner" role="region" aria-label="Instalar aplicación">
      <div className="install-pwa-banner-logo">
        {storeLogoUrl ? (
          <Image
            src={storeLogoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            unoptimized
          />
        ) : (
          <span className="install-pwa-banner-logo-fallback" aria-hidden="true">
            {getStoreInitials(displayName)}
          </span>
        )}
      </div>

      <p className="install-pwa-banner-text">
        Instala <strong>{displayName}</strong> para acceder rápido
      </p>

      <button
        type="button"
        onClick={() => void handleInstallClick()}
        disabled={installing}
        className="install-pwa-banner-action"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {installing ? "Instalando…" : "Instalar"}
      </button>

      <button
        type="button"
        onClick={dismissBanner}
        className="install-pwa-banner-dismiss"
        aria-label="Cerrar aviso de instalación"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
