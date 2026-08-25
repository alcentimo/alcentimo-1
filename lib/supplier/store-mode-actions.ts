"use server";

import { revalidatePath } from "next/cache";
import { parsePublicCatalogEnabled } from "@/lib/catalog/supplier-public-catalog-flag";
import { requireSupplierHubUser } from "@/lib/supplier/require-session";
import {
  applySupplierStoreModeSideEffects,
  persistSupplierStoreModeEnabled,
} from "@/lib/supplier/store-mode";

export async function setMySupplierStoreModeEnabled(input: {
  enabled: boolean | string | number;
}): Promise<{ error?: string; storeModeEnabled?: boolean }> {
  const auth = await requireSupplierHubUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Sin sesión." };
  }

  const enabled = parsePublicCatalogEnabled(input.enabled);
  const persisted = await persistSupplierStoreModeEnabled({
    supplierUserId: auth.user.id,
    enabled,
  });
  if (persisted.error) return { error: persisted.error };

  await applySupplierStoreModeSideEffects({
    supplierUserId: auth.user.id,
    enabled: persisted.storeModeEnabled,
  });

  revalidatePath("/proveedor/dashboard");
  revalidatePath("/proveedor/dashboard/hub");
  revalidatePath("/dashboard/catalogo");

  return { storeModeEnabled: persisted.storeModeEnabled };
}
