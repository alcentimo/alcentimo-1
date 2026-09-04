/** Campos de branding de tienda usados en cabecera y catálogo público. */
export interface StoreLogoFields {
  logo_url?: string | null;
  pwa_icon_192_url?: string | null;
  pwa_icon_512_url?: string | null;
}

function trimUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Logo de tienda para UI pública: el archivo subido en ajustes (`logo_url`),
 * con iconos PWA solo como respaldo si el logo no está definido.
 */
export function resolveStoreLogoUrl(
  store: StoreLogoFields | null | undefined,
): string | null {
  return (
    trimUrl(store?.logo_url) ??
    trimUrl(store?.pwa_icon_192_url) ??
    trimUrl(store?.pwa_icon_512_url)
  );
}
