import { unstable_noStore as noStore } from "next/cache";
import {
  extractAssistantSearchQuery,
  getMegabodegaAssistantSnapshot,
} from "@/lib/ai/megabodega-context";
import type {
  StorefrontAssistantContext,
  StorefrontAssistantMessage,
  StorefrontAssistantProduct,
} from "@/lib/ai/storefront-assistant-types";
import {
  defaultStoreSettingsConfig,
  normalizeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { buildPublicPurchaseInfo } from "@/lib/store-settings/purchase-info";
import { getStoreOpenStatus } from "@/lib/store-settings/store-hours";
import type { DaySchedule, WeekdayKey } from "@/lib/store-settings/types";
import { WEEKDAY_KEYS } from "@/lib/store-settings/types";
import { getPublicServerClient } from "@/lib/supabase/public-server";
import { getPublicStoreLocations } from "@/lib/locations/get-store-locations";
import { getPublicStoreBySlug } from "@/lib/stores";
import { fetchPublicPlatformSettings } from "@/lib/platform/get-platform-settings";

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
  schedule: Record<WeekdayKey, DaySchedule>,
): string {
  const dayParts = WEEKDAY_KEYS.filter((key) => schedule[key]?.enabled).map(
    (key) =>
      `${WEEKDAY_LABELS[key]} ${schedule[key].openTime}–${schedule[key].closeTime}`,
  );
  const daysLabel =
    dayParts.length > 0 ? dayParts.join(" · ") : "Consultar horario";
  const locationLine = [address.trim(), city.trim()].filter(Boolean).join(", ");
  return [locationLine, daysLabel].filter(Boolean).join(" · ");
}

function mapMegabodegaToStorefrontProducts(
  snapshot: Awaited<ReturnType<typeof getMegabodegaAssistantSnapshot>>,
): StorefrontAssistantProduct[] {
  return snapshot.items.map((item) => ({
    name: item.name,
    category: item.category,
    priceUsd: item.suggestedRetailUsd,
    availableStock: item.stock,
    shortDescription: null,
    variants: [],
  }));
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
  options?: { locationId?: string | null; searchQuery?: string | null },
): Promise<StorefrontAssistantContext | null> {
  noStore();

  const store = await getPublicStoreBySlug(storeSlug);
  if (!store) return null;

  const selectedLocationId = options?.locationId?.trim() || null;
  const searchQuery = options?.searchQuery?.trim() || null;

  const [settingsConfig, platformSettings, locations, megabodega] =
    await Promise.all([
      fetchStoreSettingsConfig(store.id),
      fetchPublicPlatformSettings(),
      getPublicStoreLocations(store.id),
      getMegabodegaAssistantSnapshot({
        audience: "customer",
        searchQuery,
      }),
    ]);

  const purchaseInfo = buildPublicPurchaseInfo(
    settingsConfig,
    platformSettings.dropshipShipping,
  );
  const openStatus = getStoreOpenStatus(purchaseInfo.locationHours);
  const selectedLocation = selectedLocationId
    ? locations.find((loc) => loc.id === selectedLocationId)
    : null;

  return {
    storeName: store.name,
    storeRubro: store.rubro_tienda,
    openStatus: `${openStatus.label} (${openStatus.scheduleHint})`,
    locationHoursSummary: formatLocationHoursSummary(
      purchaseInfo.locationHours.address,
      purchaseInfo.locationHours.city,
      purchaseInfo.locationHours.schedule,
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
    products: mapMegabodegaToStorefrontProducts(megabodega),
    selectedLocationName: selectedLocation?.name ?? null,
    liveSearchQuery: searchQuery,
    megabodega,
  };
}

export { extractAssistantSearchQuery as extractSearchQueryFromMessages };
