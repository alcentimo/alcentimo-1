"use client";

import { CatalogBannerImageUpload } from "@/components/dashboard/settings/CatalogBannerImageUpload";
import {
  catalogHeaderSummary,
  normalizeCatalogHeaderDraft,
} from "@/lib/store-settings/catalog-header";
import type { CatalogHeaderSettings } from "@/lib/store-settings/types";

interface CatalogHeaderFieldProps {
  value?: CatalogHeaderSettings | null;
  brandColor: string;
  disabled?: boolean;
  onChange: (next: CatalogHeaderSettings, shouldSave?: boolean) => void;
}

/**
 * Solo portada/banner de cabecera. El layout Moriche es fijo;
 * ya no se ofrecen modos de fondo ni alineación.
 */
export function CatalogHeaderField({
  value,
  brandColor: _brandColor,
  disabled = false,
  onChange,
}: CatalogHeaderFieldProps) {
  const header = normalizeCatalogHeaderDraft(value);

  function patch(partial: Partial<CatalogHeaderSettings>, shouldSave = true) {
    onChange(
      normalizeCatalogHeaderDraft({
        ...header,
        ...partial,
      }),
      shouldSave,
    );
  }

  return (
    <div className="design-header-field space-y-3">
      <p className="text-xs leading-relaxed text-zinc-500">
        Imagen de portada bajo el hero de búsqueda. Resumen:{" "}
        {catalogHeaderSummary(header)}.
      </p>

      <CatalogBannerImageUpload
        id="catalog-header-cover"
        label="Portada / banner"
        hint="Recomendado 1600×600 o similar (horizontal)."
        value={header.coverImageUrl ?? ""}
        variant="desktop"
        layout="compact"
        disabled={disabled}
        onChange={(url) => patch({ coverImageUrl: url || undefined })}
        onRemoveSlide={
          header.coverImageUrl
            ? () => patch({ coverImageUrl: undefined })
            : undefined
        }
        removeSlideLabel="Quitar portada"
      />
    </div>
  );
}
