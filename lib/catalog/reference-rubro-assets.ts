import {
  STORE_RUBRO_OPTIONS,
  type StoreRubro,
} from "@/src/config/categories";

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
 * Cada rubro expone su colección local de imágenes de alta calidad.
 */
export const REFERENCE_RUBRO_ASSETS: Record<StoreRubro, ReferenceRubroAssetMap> = {
  "ropa-moda": {
    img1: REF("ropa-moda", "blazer-milano.jpg"),
    img2: REF("ropa-moda", "jean-indigo.jpg"),
    img3: REF("ropa-moda", "sneaker-court.jpg"),
    img4: REF("ropa-moda", "bolso-valentina.jpg"),
    img5: REF("ropa-moda", "camiseta-pima.jpg"),
    img6: REF("ropa-moda", "pantalon-chino.jpg"),
  },
  ferreteria: {
    img1: REF("ferreteria", "taladro-brushless.jpg"),
    img2: REF("ferreteria", "llaves-combinadas.jpg"),
    img3: REF("ferreteria", "cable-thhn.jpg"),
    img4: REF("ferreteria", "tuberia-pvc.jpg"),
    img5: REF("ferreteria", "motosierra.jpg"),
    img6: REF("ferreteria", "tornillos-surtidos.jpg"),
  },
  calzado: {
    img1: REF("calzado", "oxford-firenze.jpg"),
    img2: REF("calzado", "bota-andes.jpg"),
    img3: REF("calzado", "sandalia-cloud.jpg"),
    img4: REF("calzado", "runner-velocity.jpg"),
    img5: REF("calzado", "mocasin-suede.jpg"),
    img6: REF("calzado", "deportivo-pro.jpg"),
  },
  tecnologia: {
    img1: REF("tecnologia", "reloj-cronografo.jpg"),
    img2: REF("tecnologia", "smartphone-nova.jpg"),
    img3: REF("tecnologia", "ultrabook-pro.jpg"),
    img4: REF("tecnologia", "audifonos-anc.jpg"),
    img5: REF("tecnologia", "monitor-ips.jpg"),
    img6: REF("tecnologia", "cargador-usbc.jpg"),
  },
  alimentos: {
    img1: REF("alimentos", "arroz-premium.jpg"),
    img2: REF("alimentos", "aceite-girasol.jpg"),
    img3: REF("alimentos", "jugo-naranja.jpg"),
    img4: REF("alimentos", "frutas-temporada.jpg"),
    img5: REF("alimentos", "mix-snacks.jpg"),
    img6: REF("alimentos", "cafe-especialidad.jpg"),
  },
  "salud-belleza": {
    img1: REF("salud-belleza", "serum-vitamina-c.jpg"),
    img2: REF("salud-belleza", "labial-velvet.jpg"),
    img3: REF("salud-belleza", "perfume-citrus.jpg"),
    img4: REF("salud-belleza", "multivitaminico.jpg"),
    img5: REF("salud-belleza", "crema-hydra.jpg"),
    img6: REF("salud-belleza", "mascarilla-facial.jpg"),
  },
  "hogar-decoracion": {
    img1: REF("hogar-decoracion", "sillon-oslo.jpg"),
    img2: REF("hogar-decoracion", "lampara-arco.jpg"),
    img3: REF("hogar-decoracion", "ollas-forged.jpg"),
    img4: REF("hogar-decoracion", "sabanas-algodon.jpg"),
    img5: REF("hogar-decoracion", "espejo-arco.jpg"),
    img6: REF("hogar-decoracion", "cojin-decorativo.jpg"),
  },
  general: {
    img1: REF("general", "kit-best-seller.jpg"),
    img2: REF("general", "edicion-signature.jpg"),
    img3: REF("general", "pack-familiar.jpg"),
    img4: REF("general", "accesorio-pro.jpg"),
    img5: REF("general", "gift-card.jpg"),
    img6: REF("general", "producto-destacado.jpg"),
  },
};

const prefetchedUrls = new Set<string>();
const prefetchPromises = new Map<string, Promise<void>>();

export function getReferenceRubroAssets(rubro: StoreRubro): ReferenceRubroAssetMap {
  return REFERENCE_RUBRO_ASSETS[rubro] ?? REFERENCE_RUBRO_ASSETS.general;
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

/** Pre-carga las imágenes de un rubro en caché del navegador. */
export function prefetchReferenceRubroAssets(rubro: StoreRubro): Promise<void> {
  return Promise.all(getReferenceRubroImageUrls(rubro).map(prefetchImage)).then(
    () => undefined,
  );
}

/** Pre-carga todas las colecciones en segundo plano (sandbox de diseño). */
export function prefetchAllReferenceRubroAssets(): Promise<void> {
  return Promise.all(
    STORE_RUBRO_OPTIONS.map((option) =>
      prefetchReferenceRubroAssets(option.value),
    ),
  ).then(() => undefined);
}
