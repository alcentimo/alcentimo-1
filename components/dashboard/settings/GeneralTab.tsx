"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { CatalogLinkCard } from "@/components/dashboard/settings/CatalogLinkCard";
import { StoreLogoField } from "@/components/dashboard/settings/StoreLogoField";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import {
  checkStoreSlugAvailability,
  saveGeneralStoreSettings,
} from "@/lib/settings/actions";
import { slugify } from "@/lib/slugify";
import { isValidStoreSlug } from "@/lib/stores/slug";
import { getPublicSiteHost } from "@/lib/site-url";
import type { ContactSettings } from "@/lib/store-settings/types";

export interface GeneralTabStore {
  name: string;
  slug: string;
  logo_url: string | null;
}

interface GeneralTabProps {
  store: GeneralTabStore;
  initialContact: ContactSettings;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function GeneralTab({ store, initialContact }: GeneralTabProps) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(store.name);
  const [savedSlug, setSavedSlug] = useState(store.slug);
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url);
  const [whatsappPhone, setWhatsappPhone] = useState(initialContact.whatsappPhone);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, startTransition] = useTransition();

  const siteHost = useMemo(() => getPublicSiteHost(), []);
  const slugPreview = slugify(storeName) || store.slug;
  const normalizedPreview = normalizeWhatsAppPhone(whatsappPhone);

  const canSave =
    storeName.trim().length > 0 &&
    isValidStoreSlug(slugPreview) &&
    slugStatus === "available" &&
    !saving;

  useEffect(() => {
    const trimmedName = storeName.trim();
    const nextSlug = slugify(storeName);

    if (!trimmedName || !nextSlug) {
      setSlugStatus("idle");
      return;
    }

    if (!isValidStoreSlug(nextSlug)) {
      setSlugStatus("invalid");
      return;
    }

    if (nextSlug === savedSlug) {
      setSlugStatus("available");
      return;
    }

    setSlugStatus("checking");
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await checkStoreSlugAvailability(nextSlug);
        setSlugStatus(result.available ? "available" : "taken");
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [storeName, savedSlug]);

  function handleSave() {
    if (!canSave) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    startTransition(async () => {
      const result = await saveGeneralStoreSettings({
        name: storeName.trim(),
        slug: slugPreview,
        logoUrl,
        whatsappPhone: whatsappPhone.trim(),
      });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setStoreName(store.name);
        setSavedSlug(store.slug);
        setLogoUrl(store.logo_url);
        setWhatsappPhone(initialContact.whatsappPhone);
        return;
      }

      setSavedSlug(slugPreview);
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <SettingsTabShell
      error={error}
      saveLabel="Guardar cambios"
      saving={saving}
      saveDisabled={!canSave}
      onSave={handleSave}
      saveHint={
        canSave
          ? "Los cambios se aplican de inmediato en tu catálogo público."
          : slugStatus === "taken"
            ? "Elige otro nombre: ese enlace ya está en uso."
            : undefined
      }
    >
      {success && (
        <p
          className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300"
          role="status"
        >
          Cambios guardados correctamente.
        </p>
      )}

      <CatalogLinkCard slug={slugPreview} className="mb-4" />

      <SettingsSection
        title="Perfil de la tienda"
        description="Nombre, logo y enlace público de tu catálogo."
        variant="payments"
      >
        <div className="general-settings-card space-y-3">
          <StoreLogoField
            storeName={storeName}
            value={logoUrl}
            onChange={(url) => {
              setLogoUrl(url);
              setSuccess(false);
            }}
          />

          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <Label htmlFor="store-name" className="payment-field-label">
              Nombre de la tienda
            </Label>
            <Input
              id="store-name"
              value={storeName}
              maxLength={120}
              onChange={(e) => {
                setStoreName(e.target.value);
                setSuccess(false);
              }}
              placeholder="Ej: Repuestos El Sol"
              className="payment-field-input mt-1.5"
            />

            <div className="mt-3">
              <Label htmlFor="store-slug-preview" className="payment-field-label">
                Enlace público
              </Label>
              <div
                id="store-slug-preview"
                className="payment-field-input mt-1.5 flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
                aria-readonly="true"
              >
                <span className="truncate">
                  {siteHost}/c/
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {slugPreview}
                  </span>
                </span>
              </div>

              {slugStatus === "checking" && (
                <p className="mt-1.5 text-[11px] text-zinc-400">Verificando enlace…</p>
              )}
              {slugStatus === "available" && storeName.trim() && (
                <p className="mt-1.5 text-[11px] text-green-600 dark:text-green-500">
                  ✓ Enlace disponible
                </p>
              )}
              {slugStatus === "taken" && (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  ✗ Este enlace ya está registrado por otro negocio
                </p>
              )}
              {slugStatus === "invalid" && storeName.trim() && (
                <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
                  ✗ El nombre genera un enlace no válido. Usa letras y números.
                </p>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="WhatsApp para pedidos"
        description="Número al que llegan los pedidos del catálogo."
        variant="payments"
      >
        <div className="general-settings-card">
          <ChannelLogo provider="whatsapp" className="mb-2.5 h-7 w-7" />

          <Label htmlFor="store-whatsapp" className="payment-field-label">
            Número de WhatsApp
          </Label>
          <Input
            id="store-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={whatsappPhone}
            onChange={(e) => {
              setWhatsappPhone(e.target.value);
              setSuccess(false);
            }}
            placeholder="Ej: 0414-1234567"
            className="payment-field-input mt-1.5"
          />

          {whatsappPhone.trim() ? (
            <p className="mt-2 text-[11px] text-zinc-400">
              {normalizedPreview
                ? `Formato internacional: +${normalizedPreview}`
                : "Revisa el número — debe tener al menos 10 dígitos."}
            </p>
          ) : null}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
