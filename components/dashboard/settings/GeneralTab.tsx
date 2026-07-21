"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CatalogLinkCard } from "@/components/dashboard/settings/CatalogLinkCard";
import { StoreLogoField } from "@/components/dashboard/settings/StoreLogoField";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  checkStoreSlugAvailability,
  saveGeneralStoreSettings,
} from "@/lib/settings/actions";
import { slugify } from "@/lib/slugify";
import { isValidStoreSlug } from "@/lib/stores/slug";
import { getPublicSiteHost } from "@/lib/site-url";
import { STORE_RUBRO_OPTIONS, normalizeStoreRubro, type StoreRubro } from "@/src/config/categories";

function getRubroLabel(value: string): string {
  return STORE_RUBRO_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export interface GeneralTabStore {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  rubro_tienda: string;
}

interface GeneralTabProps {
  store: GeneralTabStore;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function GeneralTab({ store }: GeneralTabProps) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? "");
  const [savedSlug, setSavedSlug] = useState(store.slug);
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url);
  const [rubroTienda, setRubroTienda] = useState<StoreRubro>(() =>
    normalizeStoreRubro(store.rubro_tienda),
  );
  const [savedRubro, setSavedRubro] = useState<StoreRubro>(() =>
    normalizeStoreRubro(store.rubro_tienda),
  );
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setStoreName(store.name);
    setDescription(store.description ?? "");
    setSavedSlug(store.slug);
    setLogoUrl(store.logo_url);
    setRubroTienda(normalizeStoreRubro(store.rubro_tienda));
    setSavedRubro(normalizeStoreRubro(store.rubro_tienda));
  }, [store.name, store.description, store.slug, store.logo_url, store.rubro_tienda]);

  const siteHost = useMemo(() => getPublicSiteHost(), []);
  const slugPreview = slugify(storeName) || store.slug;

  const canSave =
    storeName.trim().length > 0 &&
    rubroTienda.trim().length > 0 &&
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
    setSuccessMessage(null);
    setSaving(true);

    const previousRubro = savedRubro;

    startTransition(async () => {
      const result = await saveGeneralStoreSettings({
        name: storeName.trim(),
        slug: slugPreview,
        logoUrl,
        description,
        rubroTienda,
      });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        setStoreName(store.name);
        setDescription(store.description ?? "");
        setSavedSlug(store.slug);
        setLogoUrl(store.logo_url);
        setRubroTienda(savedRubro);
        return;
      }

      const persistedRubro = normalizeStoreRubro(
        result.rubroTienda ?? rubroTienda,
      );
      setSavedSlug(slugPreview);
      setSavedRubro(persistedRubro);
      setRubroTienda(persistedRubro);
      const rubroChanged = persistedRubro !== previousRubro;
      setSuccessMessage(
        rubroChanged
          ? `Rubro guardado: ${getRubroLabel(persistedRubro)}. Abre Nuevo producto para ver categorías y variantes de este giro.`
          : "Cambios guardados correctamente.",
      );
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
      {successMessage ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <CatalogLinkCard slug={slugPreview} className="mb-4" />

      <SettingsSection
        title="Identidad de marca"
        description="Nombre comercial, logo y descripción que ven tus clientes."
        variant="payments"
      >
        <div className="general-settings-card space-y-3">
          <StoreLogoField
            storeName={storeName}
            value={logoUrl}
            onChange={(url) => {
              setLogoUrl(url);
              setSuccessMessage(null);
            }}
          />

          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            <Label htmlFor="store-name" className="payment-field-label">
              Nombre comercial
            </Label>
            <Input
              id="store-name"
              value={storeName}
              maxLength={120}
              onChange={(e) => {
                setStoreName(e.target.value);
                setSuccessMessage(null);
              }}
              placeholder="Ej: Repuestos El Sol"
              className="payment-field-input mt-1.5"
            />

            <div className="mt-3">
              <Label htmlFor="store-description" className="payment-field-label">
                Descripción
              </Label>
              <textarea
                id="store-description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSuccessMessage(null);
                }}
                placeholder="Ej: Repuestos y accesorios para vehículos con envío a todo el país."
                className="input-field payment-field-textarea mt-1.5 resize-none"
              />
              <p className="mt-1.5 text-[11px] text-zinc-400">
                Aparece en la portada de tu catálogo público.
              </p>
            </div>

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
        title="Rubro de la tienda"
        description="Elige el giro operativo de tu tienda. Cada rubro activa formularios y catálogo especializados."
        variant="payments"
      >
        <div className="general-settings-card">
          <Label htmlFor="store-rubro" className="payment-field-label">
            Rubro <span className="text-red-500">*</span>
          </Label>
          <Select
            id="store-rubro"
            value={rubroTienda}
            required
            onChange={(e) => {
              setRubroTienda(normalizeStoreRubro(e.target.value));
              setSuccessMessage(null);
            }}
            className="payment-field-input mt-1.5"
          >
            {STORE_RUBRO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-[11px] text-zinc-400">
            Ropa: tallas y calzado · Alimentos: porciones · Tech: specs ·
            Coleccionables: condición/preventa · Belleza: volumen/tonos y tipo de piel.
          </p>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
