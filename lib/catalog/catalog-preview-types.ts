import type { CatalogDesignSettings, CatalogCurrencySettings } from "@/lib/store-settings/types";
import type { PublicPurchaseInfo } from "@/lib/store-settings/purchase-info";

/** Ajustes visuales del catálogo para la vista previa del dashboard (client-safe). */
export interface CatalogPreviewSettings {
  purchaseInfo: PublicPurchaseInfo;
  catalogDesign: CatalogDesignSettings;
  catalogCurrency: CatalogCurrencySettings;
}
