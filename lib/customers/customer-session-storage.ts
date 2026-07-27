export interface StoredCustomerSession {
  userId: string | null;
  displayName: string;
  phone: string;
  updatedAt: string;
}

export function customerSessionStorageKey(storeSlug: string): string {
  return `alcentimo-customer-${storeSlug.trim().toLowerCase()}`;
}

export function readStoredCustomerSession(
  storeSlug: string,
): StoredCustomerSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(customerSessionStorageKey(storeSlug));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCustomerSession;
    if (
      !parsed ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.phone !== "string" ||
      parsed.displayName.trim().length < 2 ||
      parsed.phone.trim().length < 10
    ) {
      return null;
    }

    return {
      userId: parsed.userId ?? null,
      displayName: parsed.displayName.trim(),
      phone: parsed.phone.trim(),
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeStoredCustomerSession(
  storeSlug: string,
  session: Pick<StoredCustomerSession, "userId" | "displayName" | "phone">,
): void {
  if (typeof window === "undefined") return;

  const payload: StoredCustomerSession = {
    userId: session.userId,
    displayName: session.displayName.trim(),
    phone: session.phone.trim(),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    customerSessionStorageKey(storeSlug),
    JSON.stringify(payload),
  );
}

export function clearStoredCustomerSession(storeSlug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(customerSessionStorageKey(storeSlug));
}
