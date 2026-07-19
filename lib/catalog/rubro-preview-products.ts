import type { CatalogListItem, Store } from "@/lib/database.types";
import { isProductOutOfStock } from "@/lib/products/variants";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

const DEFAULT_PREVIEW_EXCHANGE_RATE = 50;
/** Productos demo + tarjeta CTA en la grilla. */
export const PREVIEW_DEMO_PRODUCT_LIMIT = 5;

interface RubroPreviewProductSeed {
  name: string;
  shortDescription: string;
  microTip: string;
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

function withMicroTip(description: string, tip: string): string {
  return `${description} Sugerencia: ${tip}`;
}

const RUBRO_PREVIEW_SEEDS: Record<StoreRubro, RubroPreviewProductSeed[]> = {
  "ropa-moda": [
    {
      name: "Blazer Estructurado Milano",
      shortDescription: "Lana ligera, corte entallado, forro satinado",
      microTip: "indica tallas disponibles y composición del tejido",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 78,
      compareAtUsd: 92,
      thumbUrl: UNSPLASH("photo-1596755094514-f87e34085b56"),
      isFeatured: true,
    },
    {
      name: "Jean Indigo Selvedge",
      shortDescription: "Denim 14 oz, tiro medio, acabado stone wash",
      microTip: "menciona el stretch y la guía de tallas",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 54,
      thumbUrl: UNSPLASH("photo-1542272604-787c683553e8"),
    },
    {
      name: "Sneaker Court Premium",
      shortDescription: "Capellada en cuero, suela de goma antideslizante",
      microTip: "aclara si el envío incluye caja original",
      categoryName: "Calzado",
      categorySlug: "calzado",
      priceUsd: 89,
      thumbUrl: UNSPLASH("photo-1549298916-b41d501d3772"),
    },
    {
      name: "Bolso Crossbody Valentina",
      shortDescription: "Cuero sintético texturizado, herrajes dorados",
      microTip: "destaca capacidad en litros y largo de correa",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 42,
      thumbUrl: UNSPLASH("photo-1590871191120-3a924815213f"),
    },
    {
      name: "Camiseta Algodón Pima",
      shortDescription: "Tejido premium, cuello reforzado, colores surtidos",
      microTip: "enumera colores y tallas en stock",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 22,
      thumbUrl: UNSPLASH("photo-1521572163474-6864f9cf17ab"),
    },
  ],
  ferreteria: [
    {
      name: "Taladro Percutor Brushless 20V",
      shortDescription: "Motor sin escobillas, 2 baterías y maletín incluidos",
      microTip: "especifica torque, rpm y tiempo de garantía",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 129,
      compareAtUsd: 149,
      thumbUrl: UNSPLASH("photo-1504141923134-5411734bd814"),
      isFeatured: true,
    },
    {
      name: "Set Llaves Combinadas Cromadas",
      shortDescription: "12 piezas métricas, acabado cromo vanadio",
      microTip: "indica medidas incluidas en el set",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 34,
      thumbUrl: UNSPLASH("photo-1530124566582-793369c42300"),
    },
    {
      name: "Cable THHN 12 AWG Rolled",
      shortDescription: "Rollo 100 m, uso residencial e industrial",
      microTip: "menciona calibre, metros y certificación",
      categoryName: "Electricidad",
      categorySlug: "electricidad",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1621905251189-08b45d6a269e"),
    },
    {
      name: "Tubería PVC Presión 1/2\"",
      shortDescription: "Tramo 3 m, unión cementar, presión clase 10",
      microTip: "aclara diámetro, presión máxima y unidad de venta",
      categoryName: "Plomería",
      categorySlug: "plomeria",
      priceUsd: 8.5,
      thumbUrl: UNSPLASH("photo-1581244277609-cbdfe2a4a5c8"),
    },
    {
      name: "Motosierra Profesional 16\"",
      shortDescription: "Motor 2 tiempos, espada Oregon, arranque fácil",
      microTip: "detalla cilindrada, espada y mantenimiento incluido",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 185,
      thumbUrl: UNSPLASH("photo-1558618666-fcd25c85cd64"),
    },
  ],
  calzado: [
    {
      name: "Oxford Clásico Firenze",
      shortDescription: "Cuero plena flor, suela de cuero, plantilla acolchada",
      microTip: "publica la tabla de tallas EU y US",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 95,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1614252238186-52f967adea9a"),
    },
    {
      name: "Bota Trekking Andes GTX",
      shortDescription: "Membrana impermeable, suela Vibram, caña media",
      microTip: "menciona impermeabilidad y peso por par",
      categoryName: "Botas",
      categorySlug: "botas",
      priceUsd: 118,
      thumbUrl: UNSPLASH("photo-1608256246200-53e635b578ef"),
    },
    {
      name: "Sandalia Ergonomica Cloud",
      shortDescription: "Plantilla memory foam, correa ajustable",
      microTip: "indica tallas y si es unisex",
      categoryName: "Sandalias",
      categorySlug: "sandalias",
      priceUsd: 32,
      thumbUrl: UNSPLASH("photo-1603487746591-1b174e7b9e5b"),
    },
    {
      name: "Runner Velocity Pro",
      shortDescription: "Amortiguación reactiva, malla transpirable",
      microTip: "destaca drop, uso recomendado y kilómetros",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 86,
      thumbUrl: UNSPLASH("photo-1460353581641-37baddab0fa2"),
    },
    {
      name: "Mocasín Cuero Suede",
      shortDescription: "Acabado ante, suela flexible, ideal oficina casual",
      microTip: "aclara cuidados del ante y colores disponibles",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 74,
      thumbUrl: UNSPLASH("photo-1533867610662-aa97960f0a36"),
    },
  ],
  tecnologia: [
    {
      name: "Reloj Cronógrafo Deportivo",
      shortDescription: "Caja acero 44 mm, resistencia 10 ATM, correa silicona",
      microTip: "menciona materiales, resistencia al agua y garantía",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 89,
      compareAtUsd: 109,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1523275335684-37898b6baf30"),
    },
    {
      name: "Smartphone Nova X 128 GB",
      shortDescription: "Pantalla AMOLED 6.5\", triple cámara, carga rápida",
      microTip: "detalla RAM, almacenamiento y accesorios incluidos",
      categoryName: "Celulares",
      categorySlug: "celulares",
      priceUsd: 349,
      compareAtUsd: 389,
      thumbUrl: UNSPLASH("photo-1511707171634-5f897ff02aa9"),
    },
    {
      name: "Ultrabook Pro 14\" 16 GB",
      shortDescription: "SSD 512 GB, pantalla IPS, batería 10 h",
      microTip: "especifica procesador, puertos y sistema operativo",
      categoryName: "Laptops",
      categorySlug: "laptops",
      priceUsd: 720,
      thumbUrl: UNSPLASH("photo-1496181133206-80ce9b88a853"),
    },
    {
      name: "Audífonos ANC Studio One",
      shortDescription: "Cancelación activa, 30 h de batería, estuche incluido",
      microTip: "indica compatibilidad Bluetooth y autonomía real",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 58,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "Monitor IPS 24\" 75 Hz",
      shortDescription: "Panel antireflejo, bordes finos, montaje VESA",
      microTip: "publica resolución, puertos y si incluye cable",
      categoryName: "Repuestos",
      categorySlug: "repuestos",
      priceUsd: 135,
      thumbUrl: UNSPLASH("photo-1527443224154-c4a3942d3acf"),
    },
  ],
  alimentos: [
    {
      name: "Arroz Grano Largo Premium",
      shortDescription: "Selección especial, libre de impurezas, 1 kg",
      microTip: "indica origen, fecha de vencimiento y presentación",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 2.2,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1586201375761-83865001e26c"),
    },
    {
      name: "Aceite Girasol Extra Virgen",
      shortDescription: "Botella 900 ml, prensado en frío, sin aditivos",
      microTip: "menciona volumen, marca y condiciones de almacenaje",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 4.5,
      thumbUrl: UNSPLASH("photo-1474979266404-7eaacbcd87c5"),
    },
    {
      name: "Jugo Cold Press Naranja",
      shortDescription: "1 L, exprimido en frío, sin azúcar añadida",
      microTip: "destaca ingredientes y vida útil refrigerado",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 3.8,
      thumbUrl: UNSPLASH("photo-1622595420348-32c002b31c8a"),
    },
    {
      name: "Canasta Frutas de Temporada",
      shortDescription: "Selección fresca del día, origen local verificado",
      microTip: "aclara peso aproximado y frutas incluidas",
      categoryName: "Frescos",
      categorySlug: "frescos",
      priceUsd: 12,
      thumbUrl: UNSPLASH("photo-1488459716781-31db52582fe9"),
    },
    {
      name: "Mix Snacks Gourmet",
      shortDescription: "Frutos secos y semillas, paquete familiar 400 g",
      microTip: "lista alérgenos y contenido neto",
      categoryName: "Snacks",
      categorySlug: "snacks",
      priceUsd: 6.5,
      thumbUrl: UNSPLASH("photo-1621939514647-28a4e303c066"),
    },
  ],
  "salud-belleza": [
    {
      name: "Sérum Vitamina C Luminous",
      shortDescription: "Fórmula iluminadora, piel apagada y manchas leves",
      microTip: "menciona ingredientes activos y modo de uso",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 28,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1556228720-195a672e8a03"),
    },
    {
      name: "Labial Mate Velvet Rose",
      shortDescription: "Alta pigmentación, 8 h de duración, tono nude rosado",
      microTip: "indica tonos disponibles y si es transfer-proof",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 16,
      thumbUrl: UNSPLASH("photo-1596462502278-27bfd4033486"),
    },
    {
      name: "Eau de Parfum Citrus Noir",
      shortDescription: "50 ml, notas cítricas y madera, concentración 15%",
      microTip: "describe notas olfativas y duración aproximada",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1541643600914-78b084683601"),
    },
    {
      name: "Multivitamínico Daily Balance",
      shortDescription: "60 cápsulas, vitaminas A–E y zinc, uso diario",
      microTip: "incluye contenido por porción y contraindicaciones básicas",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 24,
      thumbUrl: UNSPLASH("photo-1584308666744-24f5f4742f8d"),
    },
    {
      name: "Crema Hidratante Hydra Calm",
      shortDescription: "Piel sensible, ácido hialurónico, textura ligera",
      microTip: "especifica tipo de piel y tamaño del envase",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 19,
      thumbUrl: UNSPLASH("photo-1570191893590-d58316145702"),
    },
  ],
  "hogar-decoracion": [
    {
      name: "Sillón Nórdico Oslo Gris",
      shortDescription: "Tela bouclé, patas roble macizo, asiento ergonómico",
      microTip: "indica medidas, peso máximo y tiempo de entrega",
      categoryName: "Muebles",
      categorySlug: "muebles",
      priceUsd: 245,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1555041469-a586c61ea9bc"),
    },
    {
      name: "Lámpara Arco Minimal Brass",
      shortDescription: "Luz cálida 2700 K, dimmer integrado, base mármol",
      microTip: "menciona altura, tipo de foco y potencia",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 68,
      thumbUrl: UNSPLASH("photo-1507473886091-9f7f8e5e3561"),
    },
    {
      name: "Set Ollas Forged Pro 3 pzas",
      shortDescription: "Antiadherente cerámico, apto inducción, tapa vidrio",
      microTip: "detalla capacidades, materiales y compatibilidad",
      categoryName: "Cocina",
      categorySlug: "cocina",
      priceUsd: 72,
      thumbUrl: UNSPLASH("photo-1556909214-d6b4c7d3a7c8"),
    },
    {
      name: "Juego Sábanas Algodón 400 Hilos",
      shortDescription: "Queen size, acabado percal, colores neutros",
      microTip: "publica medidas, hilos y instrucciones de lavado",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 58,
      thumbUrl: UNSPLASH("photo-1631049307264-da0ec154d237"),
    },
    {
      name: "Espejo Decorativo Arco",
      shortDescription: "Marco metal negro, ideal recibidor o dormitorio",
      microTip: "incluye dimensiones y peso para envío",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 44,
      thumbUrl: UNSPLASH("photo-1618220179428-22790b461013"),
    },
  ],
  general: [
    {
      name: "Kit Esencial Best Seller",
      shortDescription: "Selección curada, lista para vender desde el día uno",
      microTip: "describe qué incluye y para quién es ideal",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 35,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "Edición Limitada Signature",
      shortDescription: "Pieza exclusiva de tu línea, alta rotación",
      microTip: "genera urgencia con stock limitado real",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1523275335684-37898b6baf30"),
    },
    {
      name: "Pack Ahorro Familiar",
      shortDescription: "Precio especial por volumen, ideal WhatsApp",
      microTip: "muestra el ahorro vs comprar por unidad",
      categoryName: "Ofertas",
      categorySlug: "ofertas",
      priceUsd: 29,
      compareAtUsd: 38,
      thumbUrl: UNSPLASH("photo-1564466809058-b4256691e789"),
    },
    {
      name: "Accesorio Complemento Pro",
      shortDescription: "Perfecto para venta cruzada con tu producto estrella",
      microTip: "vincula con productos relacionados en la descripción",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 18,
      thumbUrl: UNSPLASH("photo-1546868901-68bda4c44f3b"),
    },
    {
      name: "Gift Card Digital Tienda",
      shortDescription: "Canjeable en catálogo completo, entrega inmediata",
      microTip: "explica montos disponibles y vigencia",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 25,
      thumbUrl: UNSPLASH("photo-1513885535753-8b923f176c68"),
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
    short_description: withMicroTip(seed.shortDescription, seed.microTip),
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
    .slice(0, PREVIEW_DEMO_PRODUCT_LIMIT)
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
      products: availableReal.slice(0, PREVIEW_DEMO_PRODUCT_LIMIT + 3),
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
