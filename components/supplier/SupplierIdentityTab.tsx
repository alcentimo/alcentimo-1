"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { StoreLogoUploadField } from "@/components/dashboard/settings/StoreLogoUploadField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STORE_DESCRIPTION_MAX_LENGTH } from "@/lib/stores/description";
import { getSiteUrl } from "@/lib/site-url";
import { supplierPublicCatalogPath } from "@/lib/catalog/supplier-public-catalog";
import {
  clearSupplierStorefrontLogo,
  saveSupplierStorefrontIdentity,
  uploadSupplierStorefrontLogo,
} from "@/lib/supplier/storefront-actions";

export function SupplierIdentityTab({
  tradeName,
  description,
  logoUrl,
  publicSlug,
}: {
  tradeName: string;
  description: string;
  logoUrl: string | null;
  publicSlug: string;
}) {
  const [name, setName] = useState(tradeName);
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [about, setAbout] = useState(
    description.slice(0, STORE_DESCRIPTION_MAX_LENGTH),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const catalogUrl = useMemo(() => {
    const path = supplierPublicCatalogPath(publicSlug);
    return `${getSiteUrl()}${path}`;
  }, [publicSlug]);

  const canSave = name.trim().length >= 2 && !saving;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveSupplierStorefrontIdentity({
      tradeName: name,
      description: about,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SettingsTabShell
      error={error}
      saving={saving}
      saveDisabled={!canSave}
      onSave={handleSave}
      saveLabel="Guardar identidad"
    >
      <SettingsSection
        title="Marca de tu vitrina"
        description="Así te ven los clientes en tu enlace público. Solo aparecen tus productos."
      >
        <StoreLogoUploadField
          logoUrl={logo}
          storeName={name}
          onLogoChange={setLogo}
          uploadAction={uploadSupplierStorefrontLogo}
          clearAction={clearSupplierStorefrontLogo}
          inputId="supplier-storefront-logo"
        />
        <div>
          <Label htmlFor="supplier-trade-name">Nombre comercial</Label>
          <Input
            id="supplier-trade-name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 80))}
            placeholder="Nombre de tu marca"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="supplier-public-description">Descripción</Label>
          <textarea
            id="supplier-public-description"
            value={about}
            maxLength={STORE_DESCRIPTION_MAX_LENGTH}
            onChange={(event) =>
              setAbout(event.target.value.slice(0, STORE_DESCRIPTION_MAX_LENGTH))
            }
            className="input-field payment-field-textarea mt-2 min-h-[4.5rem] resize-y"
            placeholder="Qué vendes y a quién le sirve tu catálogo."
          />
          <p className="mt-1 text-right text-[11px] text-zinc-400">
            {about.length}/{STORE_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Enlace público"
        description="Compártelo con tus clientes. El administrador habilita o desactiva la vitrina."
      >
        <p className="break-all text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {catalogUrl.replace(/^https?:\/\//, "")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="btn-brand-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
          <a
            href={catalogUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-brand-outline inline-flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir vitrina
          </a>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
