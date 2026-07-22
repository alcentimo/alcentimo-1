import type { CatalogListItem, Store } from "@/lib/database.types";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";
import {
  resolveReferenceAssetUrl,
  type ReferenceRubroAssetKey,
} from "@/lib/catalog/reference-rubro-assets";

const DEFAULT_REFERENCE_EXCHANGE_RATE = 50;

/** Catálogo fijo de referencia en Personalizar diseño (sin productos reales). */
export const REFERENCE_CATALOG_LIMIT = 6;

interface ReferenceCatalogProductSeed {
  name: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  priceUsd: number;
  compareAtUsd?: number;
  assetKey: ReferenceRubroAssetKey;
  isFeatured?: boolean;
}

const REFERENCE_CATALOG_SEEDS: Record<StoreRubro, ReferenceCatalogProductSeed[]> = {
  "ropa-moda": [
    {
      name: "Blazer Estructurado Milano",
      shortDescription: "Lana ligera, corte entallado, forro satinado · Tip: Ofrece tallas y envía foto completa",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 78,
      compareAtUsd: 92,
      assetKey: "img1",
      isFeatured: true,
    },
    {
      name: "Jean Indigo Selvedge",
      shortDescription: "Denim 14 oz, tiro medio, acabado stone wash · Tip: Pregunta tiro y comparte medidas",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 54,
      assetKey: "img2",
    },
    {
      name: "Sneaker Court Premium",
      shortDescription: "Capellada en cuero, suela de goma antideslizante · Tip: Confirma talla y muestra suela",
      categoryName: "Calzado",
      categorySlug: "calzado",
      priceUsd: 89,
      assetKey: "img3",
    },
    {
      name: "Bolso Crossbody Valentina",
      shortDescription: "Cuero sintético texturizado, herrajes dorados · Tip: Sugiérelo como regalo con envío hoy",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 42,
      assetKey: "img4",
    },
    {
      name: "Camiseta Algodón Pima",
      shortDescription: "Tejido premium, cuello reforzado, colores surtidos · Tip: Ofrece pack de colores con descuento",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 22,
      assetKey: "img5",
    },
    {
      name: "Pantalón Chino Slim Fit",
      shortDescription: "Algodón stretch, cintura media, acabado pre-lavado · Tip: Combínalo con camisa del catálogo",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 38,
      assetKey: "img6",
    },
  ],
  tecnologia: [
    {
      name: "Smartphone Nova X 256 GB",
      shortDescription: "AMOLED 6.5\", triple cámara, carga rápida 45 W",
      categoryName: "Celulares",
      categorySlug: "celulares",
      priceUsd: 349,
      compareAtUsd: 389,
      isFeatured: true,
      assetKey: "img2",
    },
    {
      name: "Ultrabook Pro 14\" 16 GB",
      shortDescription: "SSD 512 GB, IPS, batería 10 h, USB-C Thunderbolt",
      categoryName: "Laptops",
      categorySlug: "laptops",
      priceUsd: 720,
      assetKey: "img3",
    },
    {
      name: "Tablet Air 11\" 128 GB",
      shortDescription: "Pantalla Liquid Retina, Wi‑Fi 6, stylus opcional",
      categoryName: "Tablets",
      categorySlug: "tablets",
      priceUsd: 429,
      assetKey: "img1",
    },
    {
      name: "Audífonos ANC Studio One",
      shortDescription: "Cancelación activa, 30 h de batería, estuche incluido",
      categoryName: "Audio",
      categorySlug: "audio",
      priceUsd: 58,
      assetKey: "img4",
    },
    {
      name: "Cargador USB-C 65 W GaN",
      shortDescription: "Carga rápida PD, puerto dual, compacto viaje",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 32,
      assetKey: "img6",
    },
    {
      name: "Pantalla OLED repuesto 6.1\"",
      shortDescription: "Compatible serie X, kit de instalación incluido",
      categoryName: "Repuestos",
      categorySlug: "repuestos",
      priceUsd: 95,
      assetKey: "img5",
    },
  ],
  coleccionables: [
    {
      name: "Figura Exclusive Chase #42",
      shortDescription: "Sellada, edición limitada · Ideal para vitrina",
      categoryName: "Figuras",
      categorySlug: "figuras",
      priceUsd: 48,
      compareAtUsd: 55,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Cómic Variant Cover Vol. 1",
      shortDescription: "Primera impresión, excelente estado",
      categoryName: "Cómics",
      categorySlug: "comics",
      priceUsd: 22,
      assetKey: "img2",
    },
    {
      name: "Booster Box Trading Cards",
      shortDescription: "Caja sellada, set actual · Preventa disponible",
      categoryName: "Cartas",
      categorySlug: "cartas",
      priceUsd: 95,
      assetKey: "img3",
    },
    {
      name: "Pin esmaltado series pop",
      shortDescription: "Metal esmaltado, backer card incluida",
      categoryName: "Merch",
      categorySlug: "merch",
      priceUsd: 8,
      assetKey: "img4",
    },
    {
      name: "Estatua PVC 1/7 Heroine",
      shortDescription: "Abierta en excelente estado, base incluida",
      categoryName: "Figuras",
      categorySlug: "figuras",
      priceUsd: 120,
      assetKey: "img5",
    },
    {
      name: "Artbook edición especial",
      shortDescription: "Tapa dura, firmado · Stock limitado",
      categoryName: "Otros",
      categorySlug: "otros",
      priceUsd: 35,
      assetKey: "img6",
    },
  ],
  alimentos: [
    {
      name: "Tequeños de queso",
      shortDescription: "Crujientes, porción de 6, salsa de ajo · Ideal para compartir",
      categoryName: "Entradas",
      categorySlug: "entradas",
      priceUsd: 4.5,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Ensalada César",
      shortDescription: "Lechuga romana, parmesano, croutons y aderezo casero",
      categoryName: "Entradas",
      categorySlug: "entradas",
      priceUsd: 6.5,
      assetKey: "img2",
    },
    {
      name: "Hamburguesa clásica",
      shortDescription: "Carne 180 g, queso, vegetales y papas · Elige término y extras",
      categoryName: "Platos Principales",
      categorySlug: "platos-principales",
      priceUsd: 9.5,
      assetKey: "img3",
    },
    {
      name: "Pasta alfredo",
      shortDescription: "Salsa cremosa, pollo grillado opcional · Porción generosa",
      categoryName: "Platos Principales",
      categorySlug: "platos-principales",
      priceUsd: 11,
      assetKey: "img4",
    },
    {
      name: "Limonada natural",
      shortDescription: "Jarra o vaso, endulzada al gusto · Perfecta con el menú",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 2.5,
      assetKey: "img5",
    },
    {
      name: "Brownie con helado",
      shortDescription: "Chocolate intenso, helado de vainilla y salsa caliente",
      categoryName: "Postres",
      categorySlug: "postres",
      priceUsd: 5.5,
      assetKey: "img6",
    },
  ],
  "salud-belleza": [
    {
      name: "Sérum Vitamina C Luminous",
      shortDescription: "Fórmula iluminadora · Piel mixta · Tip: Explica rutina mañana y noche",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 28,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Labial Mate Velvet Rose",
      shortDescription: "Alta pigmentación, tono nude rosado · Variantes por tono",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 16,
      assetKey: "img2",
    },
    {
      name: "Eau de Parfum Citrus Noir",
      shortDescription: "50 ml, notas cítricas y madera · Presentación en ml",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 48,
      assetKey: "img3",
    },
    {
      name: "Multivitamínico Daily Balance",
      shortDescription: "60 cápsulas, vitaminas A–E y zinc · Tip: Ciclo de tres meses",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 24,
      assetKey: "img4",
    },
    {
      name: "Crema Hidratante Hydra Calm",
      shortDescription: "Ácido hialurónico, piel sensible · Presentación 50 ml / 100 ml",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 19,
      assetKey: "img5",
    },
    {
      name: "Champú Reparador Keratin Soft",
      shortDescription: "Cabello dañado, sin sulfatos · Presentación 250 ml",
      categoryName: "Cabello",
      categorySlug: "cabello",
      priceUsd: 14,
      assetKey: "img6",
    },
  ],
};

function usdToVes(usd: number, rate: number): number {
  return Math.round(usd * Math.round((rate + Number.EPSILON) * 100) / 100 * 100) / 100;
}

function seedToReferenceCatalogItem(
  store: Pick<Store, "id" | "slug" | "name">,
  rubro: StoreRubro,
  seed: ReferenceCatalogProductSeed,
  index: number,
  exchangeRate: number,
): CatalogListItem {
  const productId = `reference-catalog-${rubro}-${index}`;

  return {
    store_id: store.id,
    store_slug: store.slug,
    store_name: store.name,
    product_id: productId,
    product_slug: `referencia-${seed.categorySlug}-${index}`,
    product_name: seed.name,
    short_description: seed.shortDescription,
    brand: null,
    is_featured: seed.isFeatured ?? false,
    sort_order: index,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_id: `reference-cat-${seed.categorySlug}`,
    category_name: seed.categoryName,
    category_slug: seed.categorySlug,
    category_path: seed.categoryName,
    default_variant_id: `${productId}-default`,
    default_sku: `REF-${String(index + 1).padStart(2, "0")}`,
    stock_quantity: 12,
    reserved_quantity: 0,
    available_stock: 12,
    low_stock_threshold: 3,
    default_attributes: {},
    price_usd: seed.priceUsd,
    price_ves: usdToVes(seed.priceUsd, exchangeRate),
    compare_at_usd: seed.compareAtUsd ?? null,
    compare_at_ves: seed.compareAtUsd
      ? usdToVes(seed.compareAtUsd, exchangeRate)
      : null,
    exchange_rate_used: exchangeRate,
    product_variants: null,
    thumb_url: resolveReferenceAssetUrl(rubro, seed.assetKey),
    blur_hash: null,
    image_alt: seed.name,
  };
}

export interface ReferenceCatalogResult {
  products: CatalogListItem[];
  rubroLabel: string;
}

/** Catálogo estático de referencia según rubro — nunca usa productos reales. */
export function getReferenceCatalogForStore(
  store: Pick<Store, "id" | "slug" | "name" | "rubro_tienda">,
  exchangeRate: number | null = null,
  previewRubro?: StoreRubro,
): ReferenceCatalogResult {
  const rubro = previewRubro ?? normalizeStoreRubro(store.rubro_tienda);
  const rate = exchangeRate ?? DEFAULT_REFERENCE_EXCHANGE_RATE;
  const seeds = REFERENCE_CATALOG_SEEDS[rubro] ?? REFERENCE_CATALOG_SEEDS["ropa-moda"];

  return {
    products: seeds
      .slice(0, REFERENCE_CATALOG_LIMIT)
      .map((seed, index) =>
        seedToReferenceCatalogItem(store, rubro, seed, index, rate),
      ),
    rubroLabel: getRubroLabel(rubro),
  };
}
