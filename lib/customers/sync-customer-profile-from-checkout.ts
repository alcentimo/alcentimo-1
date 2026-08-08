import "server-only";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Persiste nombre/teléfono del paso Datos en customer_profiles (+ metadata Auth)
 * para que Mis Clientes y el autofill del próximo checkout los vean.
 */
export async function syncCustomerProfileFromCheckout(input: {
  storeId: string;
  userId: string;
  displayName: string;
  phone: string;
  deliveryAddress?: string | null;
  preferredShippingMethod?: string | null;
  preferredShippingBranchCode?: string | null;
  preferredShippingBranchName?: string | null;
  preferredShippingBranchAddress?: string | null;
}): Promise<void> {
  const displayName = input.displayName.trim().slice(0, 120);
  const phone = input.phone.trim().slice(0, 40);
  if (!displayName || !phone) return;

  const admin = createAdminClient();

  const row: Record<string, string | null> = {
    user_id: input.userId,
    store_id: input.storeId,
    display_name: displayName,
    phone,
  };

  if (input.deliveryAddress !== undefined) {
    row.delivery_address = input.deliveryAddress;
  }
  if (input.preferredShippingMethod !== undefined) {
    row.preferred_shipping_method = input.preferredShippingMethod;
  }
  if (input.preferredShippingBranchCode !== undefined) {
    row.preferred_shipping_branch_code = input.preferredShippingBranchCode;
  }
  if (input.preferredShippingBranchName !== undefined) {
    row.preferred_shipping_branch_name = input.preferredShippingBranchName;
  }
  if (input.preferredShippingBranchAddress !== undefined) {
    row.preferred_shipping_branch_address =
      input.preferredShippingBranchAddress;
  }

  const { error } = await admin.from("customer_profiles").upsert(row, {
    onConflict: "user_id,store_id",
  });

  if (error) {
    console.error(
      "[syncCustomerProfileFromCheckout] profile upsert failed",
      error.message,
    );
    return;
  }

  try {
    const { data: latest } = await admin.auth.admin.getUserById(input.userId);
    const user = latest.user;
    if (user) {
      await admin.auth.admin.updateUserById(input.userId, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          display_name: displayName,
          phone,
        },
      });
    }
  } catch (metaError) {
    console.error(
      "[syncCustomerProfileFromCheckout] metadata update failed",
      metaError,
    );
  }

  revalidatePath("/dashboard/clientes");
}
