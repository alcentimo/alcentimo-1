import type { CatalogListItem, Store } from "@/lib/database.types";
import { isProductOutOfStock } from "@/lib/products/variants";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

const DEFAULT_PREVIEW_EXCHANGE_RATE = 50;
const PREVIEW_PRODUCT_LIMIT = 8;

interface RubroPreviewProductSeed {
  name: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  priceUsd: number;
  compareAtUsd?: number;
  thumbUrl: string;
  isFeatured?: boolean;
}

/** Imágenes estáticas de Unsplash, solo para vista previa en dashboard. */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&h=600&q=80`;

const RUBRO_PREVIEW_SEEDS: Record<StoreRubro, RubroPreviewProductSeed[]> = {
  "ropa-moda": [
    {
      name: "Camisa linen premium",
      shortDescription: "Corte regular, ideal para clima cálido",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 28,
      compareAtUsd: 34,
      thumbUrl: UNSPLASH("photo-1596755094514-f87e34085b56"),
      isFeatured: true,
    },
    {
      name: "Jean slim fit",
      shortDescription: "Denim flexible, tiro medio",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 42,
      thumbUrl: UNSPLASH("photo-1542272604-787c683553e8"),
    },
    {
      name: "Sneakers urbanos",
      shortDescription: "Suela antideslizante, uso diario",
      categoryName: "Calzado",
      categorySlug: "calzado",
      priceUsd: 55,
      thumbUrl: UNSPLASH("photo-1549298916-b41d501d3772"),
    },
    {
      name: "Bolso crossbody",
      shortDescription: "Cuero sintético, correa ajustable",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 22,
      thumbUrl: UNSPLASH("photo-1590871191120-3a924815213f"),
    },
    {
      name: "Camiseta básica",
      shortDescription: "Algodón peinado, varios colores",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 14,
      thumbUrl: UNSPLASH("photo-1521572163474-6864f9cf17ab"),
    },
    {
      name: "Pantalón chino",
      shortDescription: "Tela ligera, look casual",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 36,
      thumbUrl: UNSPLASH("photo-1473966968600-fa801b546a38"),
    },
  ],
  ferreteria: [
    {
      name: "Taladro inalámbrico 20V",
      shortDescription: "Incluye batería y cargador",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 89,
      compareAtUsd: 105,
      thumbUrl: UNSPLASH("photo-1504141923134-5411734bd814"),
      isFeatured: true,
    },
    {
      name: "Juego de llaves mixtas",
      shortDescription: "12 piezas, acero cromado",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 24,
      thumbUrl: UNSPLASH("photo-1530124566582-793369c42300"),
    },
    {
      name: "Cable eléctrico 12 AWG",
      shortDescription: "Rollo 10 m, uso residencial",
      categoryName: "Electricidad",
      categorySlug: "electricidad",
      priceUsd: 18,
      thumbUrl: UNSPLASH("photo-1621905251189-08b45d6a269e"),
    },
    {
      name: "Tubería PVC 1/2\"",
      shortDescription: "Presión media, 3 metros",
      categoryName: "Plomería",
      categorySlug: "plomeria",
      priceUsd: 6.5,
      thumbUrl: UNSPLASH("photo-1581244277609-cbdfe2a4a5c8"),
    },
    {
      name: "Tornillos surtidos",
      shortDescription: "Caja 200 pzas, acero zincado",
      categoryName: "Fijación",
      categorySlug: "fijacion",
      priceUsd: 9,
      thumbUrl: UNSPLASH("photo-1504328345606-2f2e0a7d3c6b"),
    },
    {
      name: "Motosierra 16\"",
      shortDescription: "Motor 2 tiempos, uso profesional",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 145,
      thumbUrl: UNSPLASH("photo-1558618666-fcd25c85cd64"),
    },
  ],
  calzado: [
    {
      name: "Zapatos formales",
      shortDescription: "Cuero genuino, suela de goma",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 68,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1614252238186-52f967adea9a"),
    },
    {
      name: "Botas trekking",
      shortDescription: "Impermeables, caña media",
      categoryName: "Botas",
      categorySlug: "botas",
      priceUsd: 92,
      thumbUrl: UNSPLASH("photo-1608256246200-53e635b578ef"),
    },
    {
      name: "Sandalias confort",
      shortDescription: "Plantilla acolchada",
      categoryName: "Sandalias",
      categorySlug: "sandalias",
      priceUsd: 19,
      thumbUrl: UNSPLASH("photo-1603487746591-1b174e7b9e5b"),
    },
    {
      name: "Running Pro",
      shortDescription: "Amortiguación reactiva",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 74,
      thumbUrl: UNSPLASH("photo-1460353581641-37baddab0fa2"),
    },
  ],
  tecnologia: [
    {
      name: "Smartphone 128 GB",
      shortDescription: "Pantalla AMOLED, cámara triple",
      categoryName: "Celulares",
      categorySlug: "celulares",
      priceUsd: 320,
      compareAtUsd: 359,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1511707171634-5f897ff02aa9"),
    },
    {
      name: "Laptop 14\" 16 GB",
      shortDescription: "SSD 512 GB, ideal trabajo",
      categoryName: "Laptops",
      categorySlug: "laptops",
      priceUsd: 680,
      thumbUrl: UNSPLASH("photo-1496181133206-80ce9b88a853"),
    },
    {
      name: "Audífonos Bluetooth",
      shortDescription: "Cancelación de ruido",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 45,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "Cargador rápido USB-C",
      shortDescription: "65 W, compatible universal",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 22,
      thumbUrl: UNSPLASH("photo-1588872657578-7efd1f1555ed"),
    },
    {
      name: "Pantalla 24\" Full HD",
      shortDescription: "75 Hz, panel IPS",
      categoryName: "Repuestos",
      categorySlug: "repuestos",
      priceUsd: 118,
      thumbUrl: UNSPLASH("photo-1527443224154-c4a3942d3acf"),
    },
  ],
  alimentos: [
    {
      name: "Arroz premium 1 kg",
      shortDescription: "Grano largo, origen local",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 1.8,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1586201375761-83865001e26c"),
    },
    {
      name: "Aceite vegetal 900 ml",
      shortDescription: "Ideal freír y cocinar",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 3.2,
      thumbUrl: UNSPLASH("photo-1474979266404-7eaacbcd87c5"),
    },
    {
      name: "Jugo natural 1 L",
      shortDescription: "Sin azúcar añadida",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 2.5,
      thumbUrl: UNSPLASH("photo-1622595420348-32c002b31c8a"),
    },
    {
      name: "Cesta de frutas",
      shortDescription: "Selección fresca del día",
      categoryName: "Frescos",
      categorySlug: "frescos",
      priceUsd: 8,
      thumbUrl: UNSPLASH("photo-1488459716781-31db52582fe9"),
    },
    {
      name: "Mix de snacks",
      shortDescription: "Paquete familiar",
      categoryName: "Snacks",
      categorySlug: "snacks",
      priceUsd: 4.5,
      thumbUrl: UNSPLASH("photo-1621939514647-28a4e303c066"),
    },
  ],
  "salud-belleza": [
    {
      name: "Crema hidratante",
      shortDescription: "Piel seca y sensible",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 16,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1556228720-195a672e8a03"),
    },
    {
      name: "Labial mate",
      shortDescription: "Larga duración, tono nude",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 11,
      thumbUrl: UNSPLASH("photo-1596462502278-27bfd4033486"),
    },
    {
      name: "Perfume 50 ml",
      shortDescription: "Notas cítricas y amaderadas",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 38,
      thumbUrl: UNSPLASH("photo-1541643600914-78b084683601"),
    },
    {
      name: "Multivitamínico",
      shortDescription: "Frasco 60 cápsulas",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 21,
      thumbUrl: UNSPLASH("photo-1584308666744-24f5f4742f8d"),
    },
  ],
  "hogar-decoracion": [
    {
      name: "Sillón nordico",
      shortDescription: "Tela gris, patas de madera",
      categoryName: "Muebles",
      categorySlug: "muebles",
      priceUsd: 210,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1555041469-a586c61ea9bc"),
    },
    {
      name: "Lámpara de mesa",
      shortDescription: "Luz cálida, diseño minimal",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 34,
      thumbUrl: UNSPLASH("photo-1507473886091-9f7f8e5e3561"),
    },
    {
      name: "Set ollas antiadherente",
      shortDescription: "3 piezas, apto inducción",
      categoryName: "Cocina",
      categorySlug: "cocina",
      priceUsd: 58,
      thumbUrl: UNSPLASH("photo-1556909214-d6b4c7d3a7c8"),
    },
    {
      name: "Juego de sábanas",
      shortDescription: "Queen size, algodón 300 hilos",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 42,
      thumbUrl: UNSPLASH("photo-1631049307264-da0ec154d237"),
    },
  ],
  general: [
    {
      name: "Producto destacado",
      shortDescription: "Ejemplo de tu catálogo",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 25,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "Artículo popular",
      shortDescription: "Ideal para empezar a vender",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 18,
      thumbUrl: UNSPLASH("photo-1523275335684-37898b6baf30"),
    },
    {
      name: "Oferta del mes",
      shortDescription: "Precio especial por tiempo limitado",
      categoryName: "Ofertas",
      categorySlug: "ofertas",
      priceUsd: 12,
      compareAtUsd: 16,
      thumbUrl: UNSPLASH("photo-1564466809058-b4256691e789"),
    },
    {
      name: "Combo básico",
      shortDescription: "Lo esencial para tus clientes",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 32,
      thumbUrl: UNSPLASH("photo-1546868901-68bda4c44f3b"),
    },
  ],
};

function usdToVes(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

function seedToCatalogListItem(
  store: Pick<Store, "id" | "slug" | "name">,
  seed: RubroPreviewProductSeed,
  index: number,
  exchangeRate: number,
): CatalogListItem {
  const productId = `rubro-preview-${index}`;

  return {
    store_id: store.id,
    store_slug: store.slug,
    store_name: store.name,
    product_id: productId,
    product_slug: `muestra-${seed.categorySlug}-${index}`,
    product_name: seed.name,
    short_description: seed.shortDescription,
    brand: null,
    is_featured: seed.isFeatured ?? false,
    updated_at: new Date().toISOString(),
    category_id: `preview-cat-${seed.categorySlug}`,
    category_name: seed.categoryName,
    category_slug: seed.categorySlug,
    category_path: seed.categoryName,
    default_variant_id: `${productId}-default`,
    default_sku: `DEMO-${String(index + 1).padStart(2, "0")}`,
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
    thumb_url: seed.thumbUrl,
    blur_hash: null,
    image_alt: seed.name,
  };
}

export function buildRubroPreviewCatalogItems(
  store: Pick<Store, "id" | "slug" | "name" | "rubro_tienda">,
  exchangeRate: number | null = null,
): CatalogListItem[] {
  const rubro = normalizeStoreRubro(store.rubro_tienda);
  const rate = exchangeRate ?? DEFAULT_PREVIEW_EXCHANGE_RATE;
  const seeds = RUBRO_PREVIEW_SEEDS[rubro] ?? RUBRO_PREVIEW_SEEDS.general;

  return seeds
    .slice(0, PREVIEW_PRODUCT_LIMIT)
    .map((seed, index) => seedToCatalogListItem(store, seed, index, rate));
}

export interface DesignPreviewProductsResult {
  products: CatalogListItem[];
  isSampleMode: boolean;
  rubroLabel: string;
}

export function resolveDesignPreviewProducts(
  store: Pick<Store, "id" | "slug" | "name" | "rubro_tienda">,
  realProducts: CatalogListItem[],
  exchangeRate: number | null,
): DesignPreviewProductsResult {
  const rubro = normalizeStoreRubro(store.rubro_tienda);
  const rubroLabel = getRubroLabel(rubro);

  const availableReal = realProducts.filter(
    (product) => !isProductOutOfStock(product),
  );

  if (availableReal.length > 0) {
    return {
      products: availableReal.slice(0, PREVIEW_PRODUCT_LIMIT),
      isSampleMode: false,
      rubroLabel,
    };
  }

  return {
    products: buildRubroPreviewCatalogItems(store, exchangeRate),
    isSampleMode: true,
    rubroLabel,
  };
}
