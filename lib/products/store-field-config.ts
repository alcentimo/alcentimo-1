import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getRubroLabel,
  type ProductCategoryOption,
  type StoreRubro,
} from "@/src/config/categories";
import {
  getStoreRubroTienda,
  mergeStoreProductCategories,
} from "@/lib/products/rubro-categories";

export interface StoreProductFormConfig {
  rubroTienda: StoreRubro;
  rubroLabel: string;
  productCategories: ProductCategoryOption[];
}

export async function getStoreProductFormConfig(
  storeId: string,
): Promise<StoreProductFormConfig> {
  noStore();
  const supabase = await createClient();
  const rubroTienda = await getStoreRubroTienda(supabase, storeId);

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

  return {
    rubroTienda,
    rubroLabel: getRubroLabel(rubroTienda),
    productCategories: mergeStoreProductCategories(rubroTienda, storeCategoryRows),
  };
}
