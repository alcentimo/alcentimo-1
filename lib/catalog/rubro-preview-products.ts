import type { CatalogListItem, Store } from "@/lib/database.types";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type StoreRubro,
} from "@/src/config/categories";

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
  thumbUrl: string;
  isFeatured?: boolean;
}

/** Rutas locales en /public/images/referencia — carga determinista sin URLs externas. */
const REF = (rubro: string, file: string) =>
  `/images/referencia/${rubro}/${file}`;

const REFERENCE_CATALOG_SEEDS: Record<StoreRubro, ReferenceCatalogProductSeed[]> = {
  "ropa-moda": [
    {
      name: "Blazer Estructurado Milano",
      shortDescription: "Lana ligera, corte entallado, forro satinado",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 78,
      compareAtUsd: 92,
      thumbUrl: REF("ropa-moda", "blazer-milano.jpg"),
      isFeatured: true,
    },
    {
      name: "Jean Indigo Selvedge",
      shortDescription: "Denim 14 oz, tiro medio, acabado stone wash",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 54,
      thumbUrl: REF("ropa-moda", "jean-indigo.jpg"),
    },
    {
      name: "Sneaker Court Premium",
      shortDescription: "Capellada en cuero, suela de goma antideslizante",
      categoryName: "Calzado",
      categorySlug: "calzado",
      priceUsd: 89,
      thumbUrl: REF("ropa-moda", "sneaker-court.jpg"),
    },
    {
      name: "Bolso Crossbody Valentina",
      shortDescription: "Cuero sintético texturizado, herrajes dorados",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 42,
      thumbUrl: REF("ropa-moda", "bolso-valentina.jpg"),
    },
    {
      name: "Camiseta Algodón Pima",
      shortDescription: "Tejido premium, cuello reforzado, colores surtidos",
      categoryName: "Camisas",
      categorySlug: "camisas",
      priceUsd: 22,
      thumbUrl: REF("ropa-moda", "camiseta-pima.jpg"),
    },
    {
      name: "Pantalón Chino Slim Fit",
      shortDescription: "Algodón stretch, cintura media, acabado pre-lavado",
      categoryName: "Pantalones",
      categorySlug: "pantalones",
      priceUsd: 38,
      thumbUrl: REF("ropa-moda", "pantalon-chino.jpg"),
    },
  ],
  ferreteria: [
    {
      name: "Taladro Percutor Brushless 20V",
      shortDescription: "Motor sin escobillas, 2 baterías y maletín incluidos",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 129,
      compareAtUsd: 149,
      thumbUrl: REF("ferreteria", "taladro-brushless.jpg"),
      isFeatured: true,
    },
    {
      name: "Set Llaves Combinadas Cromadas",
      shortDescription: "12 piezas métricas, acabado cromo vanadio",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 34,
      thumbUrl: REF("ferreteria", "llaves-combinadas.jpg"),
    },
    {
      name: "Cable THHN 12 AWG Rolled",
      shortDescription: "Rollo 100 m, uso residencial e industrial",
      categoryName: "Electricidad",
      categorySlug: "electricidad",
      priceUsd: 48,
      thumbUrl: REF("ferreteria", "cable-thhn.jpg"),
    },
    {
      name: "Tubería PVC Presión 1/2\"",
      shortDescription: "Tramo 3 m, unión cementar, presión clase 10",
      categoryName: "Plomería",
      categorySlug: "plomeria",
      priceUsd: 8.5,
      thumbUrl: REF("ferreteria", "tuberia-pvc.jpg"),
    },
    {
      name: "Motosierra Profesional 16\"",
      shortDescription: "Motor 2 tiempos, espada Oregon, arranque fácil",
      categoryName: "Herramientas",
      categorySlug: "herramientas",
      priceUsd: 185,
      thumbUrl: REF("ferreteria", "motosierra.jpg"),
    },
    {
      name: "Tornillos Surtidos Industrial",
      shortDescription: "Caja 500 pzas, acero zincado, métrica M4–M8",
      categoryName: "Fijaciones",
      categorySlug: "fijaciones",
      priceUsd: 12,
      thumbUrl: REF("ferreteria", "tornillos-surtidos.jpg"),
    },
  ],
  calzado: [
    {
      name: "Oxford Clásico Firenze",
      shortDescription: "Cuero plena flor, suela de cuero, plantilla acolchada",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 95,
      isFeatured: true,
      thumbUrl: REF("calzado", "oxford-firenze.jpg"),
    },
    {
      name: "Bota Trekking Andes GTX",
      shortDescription: "Membrana impermeable, suela Vibram, caña media",
      categoryName: "Botas",
      categorySlug: "botas",
      priceUsd: 118,
      thumbUrl: REF("calzado", "bota-andes.jpg"),
    },
    {
      name: "Sandalia Ergonómica Cloud",
      shortDescription: "Plantilla memory foam, correa ajustable",
      categoryName: "Sandalias",
      categorySlug: "sandalias",
      priceUsd: 32,
      thumbUrl: REF("calzado", "sandalia-cloud.jpg"),
    },
    {
      name: "Runner Velocity Pro",
      shortDescription: "Amortiguación reactiva, malla transpirable",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 86,
      thumbUrl: REF("calzado", "runner-velocity.jpg"),
    },
    {
      name: "Mocasín Cuero Suede",
      shortDescription: "Acabado ante, suela flexible, ideal oficina casual",
      categoryName: "Zapatos",
      categorySlug: "zapatos",
      priceUsd: 74,
      thumbUrl: REF("calzado", "mocasin-suede.jpg"),
    },
    {
      name: "Deportivo Urban Pro",
      shortDescription: "Suela EVA ligera, upper knit, uso diario",
      categoryName: "Deportivos",
      categorySlug: "deportivos",
      priceUsd: 68,
      thumbUrl: REF("calzado", "deportivo-pro.jpg"),
    },
  ],
  tecnologia: [
    {
      name: "Reloj Cronógrafo Deportivo",
      shortDescription: "Caja acero 44 mm, resistencia 10 ATM, correa silicona",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 89,
      compareAtUsd: 109,
      isFeatured: true,
      thumbUrl: REF("tecnologia", "reloj-cronografo.jpg"),
    },
    {
      name: "Smartphone Nova X 128 GB",
      shortDescription: "Pantalla AMOLED 6.5\", triple cámara, carga rápida",
      categoryName: "Celulares",
      categorySlug: "celulares",
      priceUsd: 349,
      compareAtUsd: 389,
      thumbUrl: REF("tecnologia", "smartphone-nova.jpg"),
    },
    {
      name: "Ultrabook Pro 14\" 16 GB",
      shortDescription: "SSD 512 GB, pantalla IPS, batería 10 h",
      categoryName: "Laptops",
      categorySlug: "laptops",
      priceUsd: 720,
      thumbUrl: REF("tecnologia", "ultrabook-pro.jpg"),
    },
    {
      name: "Audífonos ANC Studio One",
      shortDescription: "Cancelación activa, 30 h de batería, estuche incluido",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 58,
      thumbUrl: REF("tecnologia", "audifonos-anc.jpg"),
    },
    {
      name: "Monitor IPS 24\" 75 Hz",
      shortDescription: "Panel antireflejo, bordes finos, montaje VESA",
      categoryName: "Repuestos",
      categorySlug: "repuestos",
      priceUsd: 135,
      thumbUrl: REF("tecnologia", "monitor-ips.jpg"),
    },
    {
      name: "Cargador USB-C 65 W GaN",
      shortDescription: "Carga rápida PD, puerto dual, compacto viaje",
      categoryName: "Accesorios",
      categorySlug: "accesorios",
      priceUsd: 32,
      thumbUrl: REF("tecnologia", "cargador-usbc.jpg"),
    },
  ],
  alimentos: [
    {
      name: "Arroz Grano Largo Premium",
      shortDescription: "Selección especial, libre de impurezas, 1 kg",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 2.2,
      isFeatured: true,
      thumbUrl: REF("alimentos", "arroz-premium.jpg"),
    },
    {
      name: "Aceite Girasol Extra Virgen",
      shortDescription: "Botella 900 ml, prensado en frío, sin aditivos",
      categoryName: "Abarrotes",
      categorySlug: "abarrotes",
      priceUsd: 4.5,
      thumbUrl: REF("alimentos", "aceite-girasol.jpg"),
    },
    {
      name: "Jugo Cold Press Naranja",
      shortDescription: "1 L, exprimido en frío, sin azúcar añadida",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 3.8,
      thumbUrl: REF("alimentos", "jugo-naranja.jpg"),
    },
    {
      name: "Canasta Frutas de Temporada",
      shortDescription: "Selección fresca del día, origen local verificado",
      categoryName: "Frescos",
      categorySlug: "frescos",
      priceUsd: 12,
      thumbUrl: REF("alimentos", "frutas-temporada.jpg"),
    },
    {
      name: "Mix Snacks Gourmet",
      shortDescription: "Frutos secos y semillas, paquete familiar 400 g",
      categoryName: "Snacks",
      categorySlug: "snacks",
      priceUsd: 6.5,
      thumbUrl: REF("alimentos", "mix-snacks.jpg"),
    },
    {
      name: "Café Especialidad Origins",
      shortDescription: "Grano 100% arábica, tueste medio, bolsa 250 g",
      categoryName: "Bebidas",
      categorySlug: "bebidas",
      priceUsd: 9.5,
      thumbUrl: REF("alimentos", "cafe-especialidad.jpg"),
    },
  ],
  "salud-belleza": [
    {
      name: "Sérum Vitamina C Luminous",
      shortDescription: "Fórmula iluminadora, piel apagada y manchas leves",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 28,
      isFeatured: true,
      thumbUrl: REF("salud-belleza", "serum-vitamina-c.jpg"),
    },
    {
      name: "Labial Mate Velvet Rose",
      shortDescription: "Alta pigmentación, 8 h de duración, tono nude rosado",
      categoryName: "Maquillaje",
      categorySlug: "maquillaje",
      priceUsd: 16,
      thumbUrl: REF("salud-belleza", "labial-velvet.jpg"),
    },
    {
      name: "Eau de Parfum Citrus Noir",
      shortDescription: "50 ml, notas cítricas y madera, concentración 15%",
      categoryName: "Fragancias",
      categorySlug: "fragancias",
      priceUsd: 48,
      thumbUrl: REF("salud-belleza", "perfume-citrus.jpg"),
    },
    {
      name: "Multivitamínico Daily Balance",
      shortDescription: "60 cápsulas, vitaminas A–E y zinc, uso diario",
      categoryName: "Suplementos",
      categorySlug: "suplementos",
      priceUsd: 24,
      thumbUrl: REF("salud-belleza", "multivitaminico.jpg"),
    },
    {
      name: "Crema Hidratante Hydra Calm",
      shortDescription: "Piel sensible, ácido hialurónico, textura ligera",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 19,
      thumbUrl: REF("salud-belleza", "crema-hydra.jpg"),
    },
    {
      name: "Mascarilla Facial Detox",
      shortDescription: "Arcilla purificante, uso semanal, piel mixta",
      categoryName: "Cuidado personal",
      categorySlug: "cuidado-personal",
      priceUsd: 14,
      thumbUrl: REF("salud-belleza", "mascarilla-facial.jpg"),
    },
  ],
  "hogar-decoracion": [
    {
      name: "Sillón Nórdico Oslo Gris",
      shortDescription: "Tela bouclé, patas roble macizo, asiento ergonómico",
      categoryName: "Muebles",
      categorySlug: "muebles",
      priceUsd: 245,
      isFeatured: true,
      thumbUrl: REF("hogar-decoracion", "sillon-oslo.jpg"),
    },
    {
      name: "Lámpara Arco Minimal Brass",
      shortDescription: "Luz cálida 2700 K, dimmer integrado, base mármol",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 68,
      thumbUrl: REF("hogar-decoracion", "lampara-arco.jpg"),
    },
    {
      name: "Set Ollas Forged Pro 3 pzas",
      shortDescription: "Antiadherente cerámico, apto inducción, tapa vidrio",
      categoryName: "Cocina",
      categorySlug: "cocina",
      priceUsd: 72,
      thumbUrl: REF("hogar-decoracion", "ollas-forged.jpg"),
    },
    {
      name: "Juego Sábanas Algodón 400 Hilos",
      shortDescription: "Queen size, acabado percal, colores neutros",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 58,
      thumbUrl: REF("hogar-decoracion", "sabanas-algodon.jpg"),
    },
    {
      name: "Espejo Decorativo Arco",
      shortDescription: "Marco metal negro, ideal recibidor o dormitorio",
      categoryName: "Decoración",
      categorySlug: "decoracion",
      priceUsd: 44,
      thumbUrl: REF("hogar-decoracion", "espejo-arco.jpg"),
    },
    {
      name: "Cojín Decorativo Velvet",
      shortDescription: "Terciopelo suave, relleno pluma sintética, 45×45 cm",
      categoryName: "Textiles",
      categorySlug: "textiles",
      priceUsd: 22,
      thumbUrl: REF("hogar-decoracion", "cojin-decorativo.jpg"),
    },
  ],
  general: [
    {
      name: "Kit Esencial Best Seller",
      shortDescription: "Selección curada, lista para vender desde el día uno",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 35,
      isFeatured: true,
      thumbUrl: REF("general", "kit-best-seller.jpg"),
    },
    {
      name: "Edición Limitada Signature",
      shortDescription: "Pieza exclusiva de tu línea, alta rotación",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 48,
      thumbUrl: REF("general", "edicion-signature.jpg"),
    },
    {
      name: "Pack Ahorro Familiar",
      shortDescription: "Precio especial por volumen, ideal WhatsApp",
      categoryName: "Ofertas",
      categorySlug: "ofertas",
      priceUsd: 29,
      compareAtUsd: 38,
      thumbUrl: REF("general", "pack-familiar.jpg"),
    },
    {
      name: "Accesorio Complemento Pro",
      shortDescription: "Perfecto para venta cruzada con tu producto estrella",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 18,
      thumbUrl: REF("general", "accesorio-pro.jpg"),
    },
    {
      name: "Gift Card Digital Tienda",
      shortDescription: "Canjeable en catálogo completo, entrega inmediata",
      categoryName: "Novedades",
      categorySlug: "novedades",
      priceUsd: 25,
      thumbUrl: REF("general", "gift-card.jpg"),
    },
    {
      name: "Producto Destacado Premium",
      shortDescription: "Referencia visual para tu vitrina principal",
      categoryName: "General",
      categorySlug: "general",
      priceUsd: 42,
      thumbUrl: REF("general", "producto-destacado.jpg"),
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

/** Catálogo estático de referencia según rubro — nunca usa productos reales. */
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
