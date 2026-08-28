import { cookies } from "next/headers";

export const DROPSHIP_CART_HOLD_COOKIE = "alcentimo_ds_hold";
export const DROPSHIP_CART_HOLD_TTL_MINUTES = 20;

export async function getOrCreateDropshipHoldSessionKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DROPSHIP_CART_HOLD_COOKIE)?.value?.trim() ?? "";
  if (existing.length >= 8) return existing;

  const next = crypto.randomUUID();
  try {
    store.set(DROPSHIP_CART_HOLD_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Server Components de solo lectura: devolver el valor igual.
  }
  return next;
}

export async function readDropshipHoldSessionKey(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(DROPSHIP_CART_HOLD_COOKIE)?.value?.trim() ?? "";
  return value.length >= 8 ? value : null;
}
