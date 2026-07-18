import type { Store } from "@/lib/database.types";

/** True si el usuario es el dueño registrado de la tienda (`stores.owner_id`). */
export function isStoreOwner(
  store: Pick<Store, "owner_id">,
  userId: string,
): boolean {
  return store.owner_id === userId;
}
