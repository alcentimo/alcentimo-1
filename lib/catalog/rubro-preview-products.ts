import type { CatalogListItem, Store } from "@/lib/database.types";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

const DEFAULT_REFERENCE_EXCHANGE_RATE = 50;

/** CatÃ¡logo fijo de referencia en Personalizar diseÃ±o (sin productos reales). */
export const REFERENCE_CATALOG_LIMIT = 6;

interface ReferenceCatalogProductSeed {
  name: string;
  shortDescription: string;
  categoryName: string;
  categorySlug: string;
  priceUsd: number;
  compareAtUsd?: number;
  thumbUrl: string;
  isFeatured?: boolean;
}

/** ImÃ¡genes estÃ¡ticas de Unsplash â€” solo catÃ¡logo de referencia en dashboard. */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=1000&q=90`;

const REFERENCE_CATALOG_SEEDS: Record<StoreRubro, ReferenceCatalogProductSeed[]> = {
  "ropa-moda": [
    {
      name: "Blazer Estructurado Milano",
      shortDescription: "Lana ligera, corte entallado, forro satinado",
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
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 54,
      thumbUrl: UNSPLASH("photo-1542272604-787c683553e8"),
    },
    {
      name: "Sneaker Court Premium",
      shortDescription: "Capellada en cuero, suela de goma antideslizante",
      categoryName: "Calzado",
      categorySlug: "calzado",
      priceUsd: 89,
      thumbUrl: UNSPLASH("photo-1549298916-b41d501d3772"),
    },
    {
      name: "Bolso Crossbody Valentina",
      shortDescription: "Cuero sintÃ©tico texturizado, herrajes dorados",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 42,
      thumbUrl: UNSPLASH("photo-1590871191120-3a924815213f"),
    },
    {
      name: "Camiseta AlgodÃ³n Pima",
      shortDescription: "Tejido premium, cuello reforzado, colores surtidos",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 22,
      thumbUrl: UNSPLASH("photo-1521572163474-6864f9cf17ab"),
    },
  ],
  ferreteria: [
    {
      name: "Taladro Percutor Brushless 20V",
      shortDescription: "Motor sin escobillas, 2 baterÃ­as y maletÃ­n incluidos",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 129,
      compareAtUsd: 149,
      thumbUrl: UNSPLASH("photo-1504141923134-5411734bd814"),
      isFeatured: true,
    },
    {
      name: "Set Llaves Combinadas Cromadas",
      shortDescription: "12 piezas mÃ©tricas, acabado cromo vanadio",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 34,
      thumbUrl: UNSPLASH("photo-1530124566582-793369c42300"),
    },
    {
      name: "Cable THHN 12 AWG Rolled",
      shortDescription: "Rollo 100 m, uso residencial e industrial",
      categoryName: "Electricidad",
      categorySlug: "electricidad",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1621905251189-08b45d6a269e"),
    },
    {
      name: "TuberÃ­a PVC PresiÃ³n 1/2\"",
      shortDescription: "Tramo 3 m, uniÃ³n cementar, presiÃ³n clase 10",
      categoryName: "PlomerÃ­a",
      categorySlug: "plomeria",
      priceUsd: 8.5,
      thumbUrl: UNSPLASH("photo-1581244277609-cbdfe2a4a5c8"),
    },
    {
      name: "Motosierra Profesional 16\"",
      shortDescription: "Motor 2 tiempos, espada Oregon, arranque fÃ¡cil",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 185,
      thumbUrl: UNSPLASH("photo-1558618666-fcd25c85cd64"),
    },
  ],
  calzado: [
    {
      name: "Oxford ClÃ¡sico Firenze",
      shortDescription: "Cuero plena flor, suela de cuero, plantilla acolchada",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 95,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1614252238186-52f967adea9a"),
    },
    {
      name: "Bota Trekking Andes GTX",
      shortDescription: "Membrana impermeable, suela Vibram, caÃ±a media",
      categoryName: "Botas",
      categorySlug: "botas",
      priceUsd: 118,
      thumbUrl: UNSPLASH("photo-1608256246200-53e635b578ef"),
    },
    {
      name: "Sandalia Ergonomica Cloud",
      shortDescription: "Plantilla memory foam, correa ajustable",
      categoryName: "Sandalias",
      categorySlug: "sandalias",
      priceUsd: 32,
      thumbUrl: UNSPLASH("photo-1603487746591-1b174e7b9e5b"),
    },
    {
      name: "Runner Velocity Pro",
      shortDescription: "AmortiguaciÃ³n reactiva, malla transpirable",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 86,
      thumbUrl: UNSPLASH("photo-1460353581641-37baddab0fa2"),
    },
    {
      name: "MocasÃ­n Cuero Suede",
      shortDescription: "Acabado ante, suela flexible, ideal oficina casual",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 74,
      thumbUrl: UNSPLASH("photo-1533867610662-aa97960f0a36"),
    },
  ],
  tecnologia: [
    {
      name: "Reloj CronÃ³grafo Deportivo",
      shortDescription: "Caja acero 44 mm, resistencia 10 ATM, correa silicona",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 89,
      compareAtUsd: 109,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1523275335684-37898b6baf30"),
    },
    {
      name: "Smartphone Nova X 128 GB",
      shortDescription: "Pantalla AMOLED 6.5\", triple cÃ¡mara, carga rÃ¡pida",
      categoryName: "Celulares",
      categorySlug: "celulares",
      priceUsd: 349,
      compareAtUsd: 389,
      thumbUrl: UNSPLASH("photo-1511707171634-5f897ff02aa9"),
    },
    {
      name: "Ultrabook Pro 14\" 16 GB",
      shortDescription: "SSD 512 GB, pantalla IPS, baterÃ­a 10 h",
      categoryName: "Laptops",
      categorySlug: "laptops",
      priceUsd: 720,
      thumbUrl: UNSPLASH("photo-1496181133206-80ce9b88a853"),
    },
    {
      name: "AudÃ­fonos ANC Studio One",
      shortDescription: "CancelaciÃ³n activa, 30 h de baterÃ­a, estuche incluido",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 58,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "Monitor IPS 24\" 75 Hz",
      shortDescription: "Panel antireflejo, bordes finos, montaje VESA",
      categoryName: "Repuestos",
      categorySlug: "repuestos",
      priceUsd: 135,
      thumbUrl: UNSPLASH("photo-1527443224154-c4a3942d3acf"),
    },
  ],
  alimentos: [
    {
      name: "Arroz Grano Largo Premium",
      shortDescription: "SelecciÃ³n especial, libre de impurezas, 1 kg",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 2.2,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1586201375761-83865001e26c"),
    },
    {
      name: "Aceite Girasol Extra Virgen",
      shortDescription: "Botella 900 ml, prensado en frÃ­o, sin aditivos",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 4.5,
      thumbUrl: UNSPLASH("photo-1474979266404-7eaacbcd87c5"),
    },
    {
      name: "Jugo Cold Press Naranja",
      shortDescription: "1 L, exprimido en frÃ­o, sin azÃºcar aÃ±adida",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 3.8,
      thumbUrl: UNSPLASH("photo-1622595420348-32c002b31c8a"),
    },
    {
      name: "Canasta Frutas de Temporada",
      shortDescription: "SelecciÃ³n fresca del dÃ­a, origen local verificado",
      categoryName: "Frescos",
      categorySlug: "frescos",
      priceUsd: 12,
      thumbUrl: UNSPLASH("photo-1488459716781-31db52582fe9"),
    },
    {
      name: "Mix Snacks Gourmet",
      shortDescription: "Frutos secos y semillas, paquete familiar 400 g",
      categoryName: "Snacks",
      categorySlug: "snacks",
      priceUsd: 6.5,
      thumbUrl: UNSPLASH("photo-1621939514647-28a4e303c066"),
    },
  ],
  "salud-belleza": [
    {
      name: "SÃ©rum Vitamina C Luminous",
      shortDescription: "FÃ³rmula iluminadora, piel apagada y manchas leves",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 28,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1556228720-195a672e8a03"),
    },
    {
      name: "Labial Mate Velvet Rose",
      shortDescription: "Alta pigmentaciÃ³n, 8 h de duraciÃ³n, tono nude rosado",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 16,
      thumbUrl: UNSPLASH("photo-1596462502278-27bfd4033486"),
    },
    {
      name: "Eau de Parfum Citrus Noir",
      shortDescription: "50 ml, notas cÃ­tricas y madera, concentraciÃ³n 15%",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1541643600914-78b084683601"),
    },
    {
      name: "MultivitamÃ­nico Daily Balance",
      shortDescription: "60 cÃ¡psulas, vitaminas Aâ€“E y zinc, uso diario",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 24,
      thumbUrl: UNSPLASH("photo-1584308666744-24f5f4742f8d"),
    },
    {
      name: "Crema Hidratante Hydra Calm",
      shortDescription: "Piel sensible, Ã¡cido hialurÃ³nico, textura ligera",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 19,
      thumbUrl: UNSPLASH("photo-1570191893590-d58316145702"),
    },
  ],
  "hogar-decoracion": [
    {
      name: "SillÃ³n NÃ³rdico Oslo Gris",
      shortDescription: "Tela bouclÃ©, patas roble macizo, asiento ergonÃ³mico",
      categoryName: "Muebles",
      categorySlug: "muebles",
      priceUsd: 245,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1555041469-a586c61ea9bc"),
    },
    {
      name: "LÃ¡mpara Arco Minimal Brass",
      shortDescription: "Luz cÃ¡lida 2700 K, dimmer integrado, base mÃ¡rmol",
      categoryName: "DecoraciÃ³n",
      categorySlug: "decoracion",
      priceUsd: 68,
      thumbUrl: UNSPLASH("photo-1507473886091-9f7f8e5e3561"),
    },
    {
      name: "Set Ollas Forged Pro 3 pzas",
      shortDescription: "Antiadherente cerÃ¡mico, apto inducciÃ³n, tapa vidrio",
      categoryName: "Cocina",
      categorySlug: "cocina",
      priceUsd: 72,
      thumbUrl: UNSPLASH("photo-1556909214-d6b4c7d3a7c8"),
    },
    {
      name: "Juego SÃ¡banas AlgodÃ³n 400 Hilos",
      shortDescription: "Queen size, acabado percal, colores neutros",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 58,
      thumbUrl: UNSPLASH("photo-1631049307264-da0ec154d237"),
    },
    {
      name: "Espejo Decorativo Arco",
      shortDescription: "Marco metal negro, ideal recibidor o dormitorio",
      categoryName: "DecoraciÃ³n",
      categorySlug: "decoracion",
      priceUsd: 44,
      thumbUrl: UNSPLASH("photo-1618220179428-22790b461013"),
    },
  ],
  general: [
    {
      name: "Kit Esencial Best Seller",
      shortDescription: "SelecciÃ³n curada, lista para vender desde el dÃ­a uno",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 35,
      isFeatured: true,
      thumbUrl: UNSPLASH("photo-1505740420928-5e560c06d30e"),
    },
    {
      name: "EdiciÃ³n Limitada Signature",
      shortDescription: "Pieza exclusiva de tu lÃ­nea, alta rotaciÃ³n",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 48,
      thumbUrl: UNSPLASH("photo-1523275335684-37898b6baf30"),
    },
    {
      name: "Pack Ahorro Familiar",
      shortDescription: "Precio especial por volumen, ideal WhatsApp",
      categoryName: "Ofertas",
      categorySlug: "ofertas",
      priceUsd: 29,
      compareAtUsd: 38,
      thumbUrl: UNSPLASH("photo-1564466809058-b4256691e789"),
    },
    {
      name: "Accesorio Complemento Pro",
      shortDescription: "Perfecto para venta cruzada con tu producto estrella",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 18,
      thumbUrl: UNSPLASH("photo-1546868901-68bda4c44f3b"),
    },
    {
      name: "Gift Card Digital Tienda",
      shortDescription: "Canjeable en catÃ¡logo completo, entrega inmediata",
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
    thumb_url: seed.thumbUrl,
    blur_hash: null,
    image_alt: seed.name,
  };
}

export interface ReferenceCatalogResult {
  products: CatalogListItem[];
  rubroLabel: string;
}

/** CatÃ¡logo estÃ¡tico de referencia segÃºn rubro â€” nunca usa productos reales. */
export function getReferenceCatalogForStore(
  store: Pick<Store, "id" | "slug" | "name" | "rubro_tienda">,
  exchangeRate: number | null = null,
): ReferenceCatalogResult {
  const rubro = normalizeStoreRubro(store.rubro_tienda);
  const rate = exchangeRate ?? DEFAULT_REFERENCE_EXCHANGE_RATE;
  const seeds = REFERENCE_CATALOG_SEEDS[rubro] ?? REFERENCE_CATALOG_SEEDS.general;

  return {
    products: seeds
      .slice(0, REFERENCE_CATALOG_LIMIT)
      .map((seed, index) =>
        seedToReferenceCatalogItem(store, rubro, seed, index, rate),
      ),
    rubroLabel: getRubroLabel(rubro),
  };
}
