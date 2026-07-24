import { unstable_noStore as noStore } from "next/cache";
import type { CatalogListItem } from "@/lib/database.types";
import { getCatalogProducts } from "@/lib/catalog";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { getStoreOpenStatus } from "@/lib/store-settings/store-hours";
import type { WeekdayKey } from "@/lib/store-settings/types";
import { WEEKDAY_KEYS } from "@/lib/store-settings/types";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import {
  getPublicStoreLocations,
  getVariantLocationStocksForStore,
} from "@/lib/locations/get-store-locations";
import type {
  StorefrontAssistantContext,
  StorefrontAssistantProduct,
  StorefrontAssistantProductVariant,
} from "@/lib/ai/storefront-assistant-types";
import { getPublicStoreBySlug } from "@/lib/stores";

const MAX_PRODUCTS = 100;

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

function formatLocationHoursSummary(
  address: string,
  city: string,
  schedule: Record<WeekdayKey, { enabled: boolean }>,
  openTime: string,
  closeTime: string,
): string {
  const openDays = WEEKDAY_KEYS.filter((key) => schedule[key]?.enabled).map(
    (key) => WEEKDAY_LABELS[key],
  );
  const daysLabel =
    openDays.length === 7
      ? "Todos los días"
      : openDays.length > 0
        ? openDays.join(", ")
        : "Consultar horario";
  const locationLine = [address.trim(), city.trim()].filter(Boolean).join(", ");
  return [locationLine, `${daysLabel}: ${openTime} – ${closeTime}`]
    .filter(Boolean)
    .join(" · ");
}

function buildLocationStockIndex(
  locationStocks: Awaited<ReturnType<typeof getVariantLocationStocksForStore>>,
  locations: Awaited<ReturnType<typeof getPublicStoreLocations>>,
): Map<string, Map<string, number>> {
  const locationNames = new Map(locations.map((loc) => [loc.id, loc.name]));
  const index = new Map<string, Map<string, number>>();

  for (const row of locationStocks) {
    const locationName = locationNames.get(row.location_id);
    if (!locationName) continue;

    let variantMap = index.get(row.variant_id);
    if (!variantMap) {
      variantMap = new Map<string, number>();
      index.set(row.variant_id, variantMap);
    }
    variantMap.set(locationName, row.available_stock);
  }

  return index;
}

function mapProductToAssistantContext(
  product: CatalogListItem,
  locationStockIndex: Map<string, Map<string, number>>,
  selectedLocationId: string | null,
  locations: Awaited<ReturnType<typeof getPublicStoreLocations>>,
): StorefrontAssistantProduct {
  const selectedLocation = selectedLocationId
    ? locations.find((loc) => loc.id === selectedLocationId)
    : null;

  const variants: StorefrontAssistantProductVariant[] =
    product.product_variants?.map((variant) => {
      const perLocation = locationStockIndex.get(variant.id);
      const locationStock = perLocation
        ? Array.from(perLocation.entries()).map(([location, stock]) => ({
            location,
            stock,
          }))
        : undefined;

      let stock = variant.stock;
      if (selectedLocation && perLocation) {
        stock = perLocation.get(selectedLocation.name) ?? 0;
      }

      return {
        name: variant.name,
        stock,
        attributes:
          "attributes" in variant &&
          variant.attributes &&
          typeof variant.attributes === "object"
            ? (variant.attributes as Record<string, string>)
            : undefined,
        locationStock,
      };
    }) ?? [];

  let availableStock = product.available_stock;
  if (selectedLocation && product.default_variant_id) {
    const perLocation = locationStockIndex.get(product.default_variant_id);
    if (perLocation) {
      availableStock = perLocation.get(selectedLocation.name) ?? 0;
    }
  }

  return {
    name: product.product_name,
    category: product.category_name,
    priceUsd: product.price_usd,
    availableStock,
    shortDescription: product.short_description,
    variants,
  };
}

async function fetchStoreSettingsConfig(storeId: string) {
  const client = getPublicServerClient();
  const { data, error } = await client
    .from("store_settings")
    .select("config")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo cargar la configuración pública: ${error.message}`);
  }

  if (!data?.config) {
    return defaultStoreSettingsConfig();
  }

  return normalizeStoreSettingsConfig(data.config);
}

export async function getStorefrontAssistantContext(
  storeSlug: string,
  options?: { locationId?: string | null },
): Promise<StorefrontAssistantContext | null> {
  noStore();

  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) return null;

  const selectedLocationId = options?.locationId?.trim() || null;

  const [settingsConfig, locations, locationStocks, catalog] = await Promise.all([
    fetchStoreSettingsConfig(store.id),
    getPublicStoreLocations(store.id),
    getVariantLocationStocksForStore(store.id),
    getCatalogProducts({ storeSlug: store.slug, limit: MAX_PRODUCTS, offset: 0 }),
  ]);

  const purchaseInfo = buildPublicPurchaseInfo(settingsConfig);
  const openStatus = getStoreOpenStatus(purchaseInfo.locationHours);
  const locationStockIndex = buildLocationStockIndex(locationStocks, locations);

  const selectedLocation = selectedLocationId
    ? locations.find((loc) => loc.id === selectedLocationId)
    : null;

  const products = catalog.products.map((product) =>
    mapProductToAssistantContext(
      product,
      locationStockIndex,
      selectedLocationId,
      locations,
    ),
  );

  return {
    storeName: store.name,
    storeRubro: store.rubro_tienda,
    openStatus: `${openStatus.label} (${openStatus.scheduleHint})`,
    locationHoursSummary: formatLocationHoursSummary(
      purchaseInfo.locationHours.address,
      purchaseInfo.locationHours.city,
      purchaseInfo.locationHours.schedule,
      purchaseInfo.locationHours.openTime,
      purchaseInfo.locationHours.closeTime,
    ),
    whatsappAvailable: Boolean(purchaseInfo.whatsappPhone.trim()),
    locations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      phone: loc.phone,
      isDefault: loc.is_default,
    })),
    shippingOptions: purchaseInfo.shipping.map((option) => ({
      label: option.label,
      description: option.description,
      estimatedTime: option.estimatedTime,
      details: option.details,
    })),
    paymentMethods: purchaseInfo.payments.map((payment) => payment.label),
    products,
    selectedLocationName: selectedLocation?.name ?? null,
  };
}
