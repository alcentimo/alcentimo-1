"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { STORE_SLUG_UNAVAILABLE_MESSAGE } from "@/lib/stores/slug-availability";
import { getPublicSiteHost } from "@/lib/site-url";
import { STORE_RUBRO_OPTIONS, normalizeStoreRubro, type StoreRubro } from "@/src/config/categories";
import { InterfacePreferencesSettingsSection } from "@/components/dashboard/settings/InterfacePreferencesSettingsSection";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import { StoreDescriptionAiButton } from "@/components/dashboard/settings/StoreDescriptionAiButton";
import { StoreLogoUploadField } from "@/components/dashboard/settings/StoreLogoUploadField";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/cn";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";

const RUBRO_CHANGE_CONFIRM_TITLE = "¿Estás seguro de cambiar el rubro?";
const RUBRO_CHANGE_CONFIRM_DESCRIPTION =
  "Esto adaptará los campos de tu catálogo para los nuevos productos, pero tus productos actuales conservarán su información original.";

function getRubroLabel(value: string): string {
  return STORE_RUBRO_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export interface GeneralTabStore {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  rubro_tienda: string;
  enable_pc_builder?: boolean;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
}

interface GeneralTabProps {
  store: GeneralTabStore;
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function GeneralTab({ store }: GeneralTabProps) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(store.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url);
  const [description, setDescription] = useState(store.description ?? "");
  const [savedSlug, setSavedSlug] = useState(store.slug);
  const [catalogSlug, setCatalogSlug] = useState(store.slug);
  const [slugAutoSync, setSlugAutoSync] = useState(
    () => slugify(store.name) === store.slug,
  );
  const [rubroTienda, setRubroTienda] = useState<StoreRubro>(() =>
    normalizeStoreRubro(store.rubro_tienda),
  );
  const [savedRubro, setSavedRubro] = useState<StoreRubro>(() =>
    normalizeStoreRubro(store.rubro_tienda),
  );
  const [enablePcBuilder, setEnablePcBuilder] = useState(
    () => store.enable_pc_builder ?? false,
  );
  const [savedEnablePcBuilder, setSavedEnablePcBuilder] = useState(
    () => store.enable_pc_builder ?? false,
  );
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("available");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rubroConfirmOpen, setRubroConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setStoreName(store.name);
    setLogoUrl(store.logo_url);
    setDescription(store.description ?? "");
    setSavedSlug(store.slug);
    setCatalogSlug(store.slug);
    setSlugAutoSync(slugify(store.name) === store.slug);
    setRubroTienda(normalizeStoreRubro(store.rubro_tienda));
    setSavedRubro(normalizeStoreRubro(store.rubro_tienda));
    setEnablePcBuilder(store.enable_pc_builder ?? false);
    setSavedEnablePcBuilder(store.enable_pc_builder ?? false);
  }, [
    store.name,
    store.logo_url,
    store.description,
    store.slug,
    store.rubro_tienda,
    store.enable_pc_builder,
  ]);

  const isTecnologia = storeUsesRubroProductModule(rubroTienda, "tecnologia");

  const siteHost = useMemo(() => getPublicSiteHost(), []);

  const canSave =
    storeName.trim().length > 0 &&
    rubroTienda.trim().length > 0 &&
    isValidStoreSlug(catalogSlug) &&
    slugStatus === "available" &&
    !saving;

  useEffect(() => {
    if (slugAutoSync) {
      const nextSlug = slugify(storeName);
      setCatalogSlug(nextSlug || savedSlug);
    }
  }, [storeName, slugAutoSync, savedSlug]);

  useEffect(() => {
    const nextSlug = catalogSlug.trim();

    if (!nextSlug) {
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
  }, [catalogSlug, savedSlug]);

  function persistGeneralSettings() {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    const previousRubro = savedRubro;

    startTransition(async () => {
      const result = await saveGeneralStoreSettings({
        name: storeName.trim(),
        slug: catalogSlug,
        description,
        rubroTienda,
        enablePcBuilder: isTecnologia ? enablePcBuilder : false,
      });
      setSaving(false);
      setRubroConfirmOpen(false);

      if (result.error) {
        setError(result.error);
        setStoreName(store.name);
        setDescription(store.description ?? "");
        setSavedSlug(store.slug);
        setCatalogSlug(store.slug);
        setSlugAutoSync(slugify(store.name) === store.slug);
        setRubroTienda(savedRubro);
        setEnablePcBuilder(savedEnablePcBuilder);
        return;
      }

      const persistedRubro = normalizeStoreRubro(
        result.rubroTienda ?? rubroTienda,
      );
      setSavedSlug(catalogSlug);
      setSlugAutoSync(slugify(storeName.trim()) === catalogSlug);
      setSavedRubro(persistedRubro);
      setRubroTienda(persistedRubro);
      const nextEnablePcBuilder = isTecnologia ? enablePcBuilder : false;
      setEnablePcBuilder(nextEnablePcBuilder);
      setSavedEnablePcBuilder(nextEnablePcBuilder);
      const rubroChanged = persistedRubro !== previousRubro;
      setSuccessMessage(
        rubroChanged
          ? `Rubro actualizado a ${getRubroLabel(persistedRubro)}. Tus productos anteriores se conservaron; los nuevos usarán los campos de este giro.`
          : "Cambios guardados correctamente.",
      );
      router.refresh();
    });
  }

  function handleRubroConfirmDismiss(open: boolean) {
    if (!open && !saving) {
      setRubroTienda(savedRubro);
    }
    setRubroConfirmOpen(open);
  }

  function handleSave() {
    if (!canSave) return;

    if (rubroTienda !== savedRubro) {
      setRubroConfirmOpen(true);
      return;
    }

    persistGeneralSettings();
  }

  return (
    <>
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
              ? "Corrige el enlace del catálogo antes de guardar."
              : slugStatus === "checking"
                ? "Verificando disponibilidad del enlace…"
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

      <SettingsSection
        title="Identidad de marca"
        description="Logo, nombre comercial y descripción que ven tus clientes en el catálogo."
        variant="payments"
      >
        <div className="settings-identity-grid">
          <div className="settings-identity-card settings-identity-card--fields">
            <StoreLogoUploadField
              logoUrl={logoUrl}
              storeName={storeName}
              disabled={saving}
              onLogoChange={(url) => {
                setLogoUrl(url);
                setSuccessMessage(null);
                setError(null);
                router.refresh();
              }}
            />

            <div className="mt-5">
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
                className="payment-field-input mt-2"
              />
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="store-description" className="payment-field-label">
                  Descripción
                </Label>
                <StoreDescriptionAiButton
                  storeName={storeName}
                  storeRubro={rubroTienda}
                  draftDescription={description}
                  disabled={saving}
                  onGenerated={(nextDescription) => {
                    setDescription(nextDescription);
                    setSuccessMessage(null);
                    setError(null);
                  }}
                />
              </div>
              <textarea
                id="store-description"
                rows={4}
                maxLength={500}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSuccessMessage(null);
                }}
                placeholder="Ej: Repuestos y accesorios para vehículos con envío a todo el país."
                className="input-field payment-field-textarea mt-2 min-h-[6rem] resize-y"
              />
              <p className="mt-2 text-[11px] text-zinc-400">
                Aparece en la portada de tu catálogo público.
              </p>
            </div>
          </div>

          <div className="settings-identity-card settings-identity-card--slug">
            <Label htmlFor="store-catalog-slug" className="payment-field-label">
              Enlace del catálogo
            </Label>
            <p className="mt-1 text-[11px] text-zinc-400">
              URL pública de tu tienda. Se valida en tiempo real contra otros comercios.
            </p>

            {slugStatus === "taken" ? (
              <p
                className="settings-error-banner mt-3 text-xs"
                role="alert"
              >
                {STORE_SLUG_UNAVAILABLE_MESSAGE}
              </p>
            ) : null}

            <div
              className={cn(
                "settings-slug-editor mt-3",
                slugStatus === "taken" && "settings-slug-editor--taken",
                slugStatus === "available" &&
                  catalogSlug !== savedSlug &&
                  "settings-slug-editor--available",
              )}
            >
              <span className="settings-slug-editor-prefix">{siteHost}/c/</span>
              <Input
                id="store-catalog-slug"
                value={catalogSlug}
                maxLength={80}
                aria-invalid={slugStatus === "taken" || slugStatus === "invalid"}
                aria-describedby="store-catalog-slug-status"
                onChange={(e) => {
                  const nextValue = slugify(e.target.value);
                  setCatalogSlug(nextValue);
                  setSlugAutoSync(false);
                  setSuccessMessage(null);
                }}
                placeholder="nombre-tienda"
                className="settings-slug-editor-input"
              />
            </div>

            <p id="store-catalog-slug-status" className="mt-2 text-[11px]">
              {slugStatus === "checking" && (
                <span className="text-zinc-400">Verificando enlace…</span>
              )}
              {slugStatus === "available" && catalogSlug && (
                <span className="text-green-600 dark:text-green-500">
                  Enlace disponible
                </span>
              )}
              {slugStatus === "taken" && (
                <span className="text-red-600 dark:text-red-400">
                  Enlace no disponible
                </span>
              )}
              {slugStatus === "invalid" && catalogSlug && (
                <span className="text-red-600 dark:text-red-400">
                  Usa solo letras minúsculas, números y guiones.
                </span>
              )}
            </p>

            {slugAutoSync ? (
              <p className="mt-1 text-[11px] text-zinc-400">
                Se actualiza automáticamente desde el nombre comercial. Edítalo para personalizarlo.
              </p>
            ) : (
              <button
                type="button"
                className="mt-1 text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                onClick={() => {
                  setSlugAutoSync(true);
                  setCatalogSlug(slugify(storeName) || savedSlug);
                }}
              >
                Volver a sincronizar con el nombre comercial
              </button>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Rubro de la tienda"
        description="Elige el giro operativo de tu tienda. Cada rubro activa formularios y catálogo especializados."
        variant="payments"
      >
        <div className="settings-identity-card">
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
            Ropa: tallas y colores · Alimentos: porciones · Tech: specs ·
            Coleccionables: condición/preventa · Belleza: volumen/tonos.
            Cambiar rubro no borra productos existentes.
          </p>
        </div>
      </SettingsSection>

      {isTecnologia ? (
        <SettingsSection
          title="Arma tu PC"
          description="Muestra la pestaña de cotización de PC en tu catálogo público para clientes."
          variant="payments"
        >
          <SettingsOptionCard
            id="enable-pc-builder"
            label="Activar Arma tu PC"
            description="Los compradores podrán elegir componentes con stock real y enviar la cotización por WhatsApp. Clasifica tus productos con el slot de PC Builder en inventario."
            checked={enablePcBuilder}
            onChange={(checked) => {
              setEnablePcBuilder(checked);
              setSuccessMessage(null);
            }}
            disabled={saving}
          />
        </SettingsSection>
      ) : null}

      <InterfacePreferencesSettingsSection />
      </SettingsTabShell>

      <AlertDialog
        open={rubroConfirmOpen}
        onOpenChange={handleRubroConfirmDismiss}
        title={RUBRO_CHANGE_CONFIRM_TITLE}
        description={RUBRO_CHANGE_CONFIRM_DESCRIPTION}
        confirmLabel="Sí, cambiar rubro"
        cancelLabel="Cancelar"
        loading={saving}
        onConfirm={persistGeneralSettings}
      />
    </>
  );
}
