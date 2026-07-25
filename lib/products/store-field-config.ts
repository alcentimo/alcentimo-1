import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getRubroLabel,
  normalizeStoreRubro,
  type ProductCategoryOption,
  type StoreRubro,
} from "@/src/config/categories";
import { mergeStoreProductCategories } from "@/lib/products/rubro-categories";
import { storeHasPCBuilder } from "@/lib/rubros/modules/tecnologia/pc-builder";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";

export interface StoreProductFormConfig {
  rubroTienda: StoreRubro;
  rubroLabel: string;
  productCategories: ProductCategoryOption[];
  wholesaleEnabled: boolean;
  enablePcBuilder: boolean;
}

export async function getStoreProductFormConfig(
  storeId: string,
): Promise<StoreProductFormConfig> {
  noStore();
  const supabase = await createClient();

  const { data: storeRowWithPcBuilder, error: storeError } = await supabase
    .from("stores")
    .select("rubro_tienda, enable_pc_builder")
    .eq("id", storeId)
    .maybeSingle();

  let storeRow:
    | {
        rubro_tienda: string | null;
        enable_pc_builder?: boolean | null;
      }
    | null = storeRowWithPcBuilder;

  if (storeError) {
    // Fallback si enable_pc_builder aún no existe en el proyecto remoto.
    const { data: fallbackRow, error: fallbackError } = await supabase
      .from("stores")
      .select("rubro_tienda")
      .eq("id", storeId)
      .maybeSingle();

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    storeRow = fallbackRow;
  }

  const rubroTienda = normalizeStoreRubro(storeRow?.rubro_tienda as string | null);
  const enablePcBuilderValue =
    storeRow && "enable_pc_builder" in storeRow
      ? storeRow.enable_pc_builder
      : storeUsesRubroProductModule(rubroTienda, "tecnologia")
        ? true
        : false;

  const { data: storeCategories, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const storeCategoryRows = (storeCategories ?? []).map((item) => ({
    slug: item.slug as string,
    name: item.name as string,
  }));

  const storeSettings = await getStoreSettingsConfig(storeId);

  return {
    rubroTienda,
    rubroLabel: getRubroLabel(rubroTienda),
    productCategories: mergeStoreProductCategories(rubroTienda, storeCategoryRows),
    wholesaleEnabled: storeSettings.catalogCurrency.wholesaleEnabled,
    enablePcBuilder: storeHasPCBuilder(rubroTienda, enablePcBuilderValue),
  };
}
