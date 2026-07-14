import { createClient } from "@/lib/supabase/server";
import {
  getRubroLabel,
  type ProductCategoryOption,
  type StoreRubro,
} from "@/src/config/categories";
import {
  getProductCategoryOptionsForStore,
  getStoreRubroTienda,
} from "@/lib/products/rubro-categories";

export interface StoreProductFormConfig {
  rubroTienda: StoreRubro;
  rubroLabel: string;
  productCategories: ProductCategoryOption[];
}

export async function getStoreProductFormConfig(
  storeId: string,
): Promise<StoreProductFormConfig> {
  const supabase = await createClient();
  const rubroTienda = await getStoreRubroTienda(supabase, storeId);

  return {
    rubroTienda,
    rubroLabel: getRubroLabel(rubroTienda),
    productCategories: getProductCategoryOptionsForStore(rubroTienda),
  };
}
