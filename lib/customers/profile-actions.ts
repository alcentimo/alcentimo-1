"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerProfile } from "@/lib/customers/ensure-customer-profile";
import { getStoreCustomerAccountPath } from "@/lib/store-host";

export type SaveCustomerProfileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveCustomerProfile(input: {
  storeSlug: string;
  displayName: string;
  phone: string;
}): Promise<SaveCustomerProfileResult> {
  const storeSlug = input.storeSlug.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const phone = input.phone.trim();

  if (displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Debes iniciar sesión para guardar tu perfil." };
  }

  const result = await ensureCustomerProfile(supabase, user, storeSlug, {
    displayName,
    phone,
    requireDisplayName: true,
    requirePhone: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(getStoreCustomerAccountPath(storeSlug, "perfil"));
  revalidatePath(`/c/${storeSlug}/perfil`);

  return { ok: true };
}
