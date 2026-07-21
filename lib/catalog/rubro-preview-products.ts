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
  ferreteria: [
    {
      name: "Taladro Percutor Brushless 20V",
      shortDescription: "Motor sin escobillas, 2 baterías y maletín incluidos · Tip: Destaca garantía y baterías incluidas",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 129,
      compareAtUsd: 149,
      assetKey: "img1",
      isFeatured: true,
    },
    {
      name: "Set Llaves Combinadas Cromadas",
      shortDescription: "12 piezas métricas, acabado cromo vanadio · Tip: Ideal para kit básico o regalo",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 34,
      assetKey: "img2",
    },
    {
      name: "Cable THHN 12 AWG Rolled",
      shortDescription: "Rollo 100 m, uso residencial e industrial · Tip: Indica metros disponibles y entrega rápida",
      categoryName: "Electricidad",
      categorySlug: "electricidad",
      priceUsd: 48,
      assetKey: "img3",
    },
    {
      name: "Tubería PVC Presión 1/2\"",
      shortDescription: "Tramo 3 m, unión cementar, presión clase 10 · Tip: Cobra por metro o venta mínima",
      categoryName: "Plomería",
      categorySlug: "plomeria",
      priceUsd: 8.5,
      assetKey: "img4",
    },
    {
      name: "Motosierra Profesional 16\"",
      shortDescription: "Motor 2 tiempos, espada Oregon, arranque fácil · Tip: Envía video de funcionamiento al cliente",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 185,
      assetKey: "img5",
    },
    {
      name: "Tornillos Surtidos Industrial",
      shortDescription: "Caja 500 pzas, acero zincado, métrica M4–M8 · Tip: Vende por caja o surtido personalizado",
      categoryName: "Fijaciones",
      categorySlug: "fijaciones",
      priceUsd: 12,
      assetKey: "img6",
    },
  ],
  calzado: [
    {
      name: "Oxford Clásico Firenze",
      shortDescription: "Cuero plena flor, suela de cuero, plantilla acolchada · Tip: Confirma talla con plantilla referencia",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 95,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Bota Trekking Andes GTX",
      shortDescription: "Membrana impermeable, suela Vibram, caña media · Tip: Pregunta uso y recomienda media talla",
      categoryName: "Botas",
      categorySlug: "botas",
      priceUsd: 118,
      assetKey: "img2",
    },
    {
      name: "Sandalia Ergonómica Cloud",
      shortDescription: "Plantilla memory foam, correa ajustable · Tip: Ofrece probar en tienda o cambio",
      categoryName: "Sandalias",
      categorySlug: "sandalias",
      priceUsd: 32,
      assetKey: "img3",
    },
    {
      name: "Runner Velocity Pro",
      shortDescription: "Amortiguación reactiva, malla transpirable · Tip: Comparte video corriendo y tallas",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 86,
      assetKey: "img4",
    },
    {
      name: "Mocasín Cuero Suede",
      shortDescription: "Acabado ante, suela flexible, ideal oficina casual · Tip: Sugiere combinar con pantalón formal",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 74,
      assetKey: "img5",
    },
    {
      name: "Deportivo Urban Pro",
      shortDescription: "Suela EVA ligera, upper knit, uso diario · Tip: Ofrece envío gratis sobre cierto monto",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 68,
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
      shortDescription: "Fórmula iluminadora, piel apagada y manchas leves · Tip: Explica rutina mañana y noche",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 28,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Labial Mate Velvet Rose",
      shortDescription: "Alta pigmentación, 8 h de duración, tono nude rosado · Tip: Envía swatch en foto con luz natural",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 16,
      assetKey: "img2",
    },
    {
      name: "Eau de Parfum Citrus Noir",
      shortDescription: "50 ml, notas cítricas y madera, concentración 15% · Tip: Ofrece muestra o decant antes de comprar",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 48,
      assetKey: "img3",
    },
    {
      name: "Multivitamínico Daily Balance",
      shortDescription: "60 cápsulas, vitaminas A–E y zinc, uso diario · Tip: Recomienda ciclo de tres meses",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 24,
      assetKey: "img4",
    },
    {
      name: "Crema Hidratante Hydra Calm",
      shortDescription: "Piel sensible, ácido hialurónico, textura ligera · Tip: Pregunta tipo de piel antes de recomendar",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 19,
      assetKey: "img5",
    },
    {
      name: "Mascarilla Facial Detox",
      shortDescription: "Arcilla purificante, uso semanal, piel mixta · Tip: Sugiere rutina completa con sérum",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 14,
      assetKey: "img6",
    },
  ],
  "hogar-decoracion": [
    {
      name: "Sillón Nórdico Oslo Gris",
      shortDescription: "Tela bouclé, patas roble macizo, asiento ergonómico · Tip: Envía medidas y foto en ambiente real",
      categoryName: "Muebles",
      categorySlug: "muebles",
      priceUsd: 245,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Lámpara Arco Minimal Brass",
      shortDescription: "Luz cálida 2700 K, dimmer integrado, base mármol · Tip: Pregunta altura techo y estilo ambiente",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 68,
      assetKey: "img2",
    },
    {
      name: "Set Ollas Forged Pro 3 pzas",
      shortDescription: "Antiadherente cerámico, apto inducción, tapa vidrio · Tip: Ofrece set completo con descuento",
      categoryName: "Cocina",
      categorySlug: "cocina",
      priceUsd: 72,
      assetKey: "img3",
    },
    {
      name: "Juego Sábanas Algodón 400 Hilos",
      shortDescription: "Queen size, acabado percal, colores neutros · Tip: Confirma tamaño cama y color disponible",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 58,
      assetKey: "img4",
    },
    {
      name: "Espejo Decorativo Arco",
      shortDescription: "Marco metal negro, ideal recibidor o dormitorio · Tip: Sugiere medir pared antes de confirmar",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 44,
      assetKey: "img5",
    },
    {
      name: "Cojín Decorativo Velvet",
      shortDescription: "Terciopelo suave, relleno pluma sintética, 45×45 cm · Tip: Vende en par o pack decorativo",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 22,
      assetKey: "img6",
    },
  ],
  general: [
    {
      name: "Kit Esencial Best Seller",
      shortDescription: "Selección curada, lista para vender desde el día uno · Tip: Personaliza mensaje con nombre tienda",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 35,
      isFeatured: true,
      assetKey: "img1",
    },
    {
      name: "Edición Limitada Signature",
      shortDescription: "Pieza exclusiva de tu línea, alta rotación · Tip: Crea urgencia con stock limitado",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 48,
      assetKey: "img2",
    },
    {
      name: "Pack Ahorro Familiar",
      shortDescription: "Precio especial por volumen, ideal WhatsApp · Tip: Destaca ahorro vs compra individual",
      categoryName: "Ofertas",
      categorySlug: "ofertas",
      priceUsd: 29,
      compareAtUsd: 38,
      assetKey: "img3",
    },
    {
      name: "Accesorio Complemento Pro",
      shortDescription: "Perfecto para venta cruzada con tu producto estrella · Tip: Ofrece junto al más vendido",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 18,
      assetKey: "img4",
    },
    {
      name: "Gift Card Digital Tienda",
      shortDescription: "Canjeable en catálogo completo, entrega inmediata · Tip: Ideal regalo, envía código al instante",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 25,
      assetKey: "img5",
    },
    {
      name: "Producto Destacado Premium",
      shortDescription: "Referencia visual para tu vitrina principal · Tip: Compártelo primero en status WhatsApp",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 42,
      assetKey: "img6",
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
