import type { StoreRubro } from "@/src/config/categories";

/** Ancho máximo de thumbnails WebP servidos en vista previa. */
export const REFERENCE_THUMB_MAX_WIDTH = 400;

/** Claves de imagen por producto dentro de cada rubro (img1 … img6). */
export type ReferenceRubroAssetKey =
  | "img1"
  | "img2"
  | "img3"
  | "img4"
  | "img5"
  | "img6";

export type ReferenceRubroAssetMap = Record<ReferenceRubroAssetKey, string>;

const REF = (rubro: string, file: string) =>
  `/images/referencia/${rubro}/${file}`;

/**
 * Diccionario de assets por rubro — motor de intercambio de la vista previa.
 * Thumbnails WebP locales (máx. 400px), nunca imágenes originales pesadas.
 */
export const REFERENCE_RUBRO_ASSETS: Record<StoreRubro, ReferenceRubroAssetMap> = {
  "ropa-moda": {
    img1: REF("ropa-moda", "blazer-milano.webp"),
    img2: REF("ropa-moda", "jean-indigo.webp"),
    img3: REF("ropa-moda", "sneaker-court.webp"),
    img4: REF("ropa-moda", "bolso-valentina.webp"),
    img5: REF("ropa-moda", "camiseta-pima.webp"),
    img6: REF("ropa-moda", "pantalon-chino.webp"),
  },
  alimentos: {
    img1: REF("alimentos", "arroz-premium.webp"),
    img2: REF("alimentos", "aceite-girasol.webp"),
    img3: REF("alimentos", "jugo-naranja.webp"),
    img4: REF("alimentos", "frutas-temporada.webp"),
    img5: REF("alimentos", "mix-snacks.webp"),
    img6: REF("alimentos", "cafe-especialidad.webp"),
  },
  tecnologia: {
    img1: REF("tecnologia", "reloj-cronografo.webp"),
    img2: REF("tecnologia", "smartphone-nova.webp"),
    img3: REF("tecnologia", "ultrabook-pro.webp"),
    img4: REF("tecnologia", "audifonos-anc.webp"),
    img5: REF("tecnologia", "monitor-ips.webp"),
    img6: REF("tecnologia", "cargador-usbc.webp"),
  },
  // Vista previa: reutiliza assets generales hasta tener set dedicado.
  coleccionables: {
    img1: REF("general", "edicion-signature.webp"),
    img2: REF("general", "kit-best-seller.webp"),
    img3: REF("general", "producto-destacado.webp"),
    img4: REF("general", "accesorio-pro.webp"),
    img5: REF("general", "gift-card.webp"),
    img6: REF("general", "pack-familiar.webp"),
  },
};

const prefetchedUrls = new Set<string>();
const prefetchPromises = new Map<string, Promise<void>>();

export function getReferenceRubroAssets(rubro: StoreRubro): ReferenceRubroAssetMap {
  return REFERENCE_RUBRO_ASSETS[rubro] ?? REFERENCE_RUBRO_ASSETS["ropa-moda"];
}

export function resolveReferenceAssetUrl(
  rubro: StoreRubro,
  assetKey: ReferenceRubroAssetKey,
): string {
  return getReferenceRubroAssets(rubro)[assetKey];
}

export function getReferenceRubroImageUrls(rubro: StoreRubro): string[] {
  return Object.values(getReferenceRubroAssets(rubro));
}

export function isReferenceRubroAssetsCached(rubro: StoreRubro): boolean {
  return getReferenceRubroImageUrls(rubro).every((url) => prefetchedUrls.has(url));
}

function prefetchImage(src: string): Promise<void> {
  if (prefetchedUrls.has(src)) {
    return Promise.resolve();
  }

  const pending = prefetchPromises.get(src);
  if (pending) return pending;

  const promise = new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      prefetchedUrls.add(src);
      prefetchPromises.delete(src);
      resolve();
    };
    img.onerror = () => {
      prefetchPromises.delete(src);
      resolve();
    };
    img.src = src;
  });

  prefetchPromises.set(src, promise);
  return promise;
}

/** Pre-carga las imágenes WebP de un rubro en caché del navegador. */
export function prefetchReferenceRubroAssets(rubro: StoreRubro): Promise<void> {
  return Promise.all(getReferenceRubroImageUrls(rubro).map(prefetchImage)).then(
    () => undefined,
  );
}
