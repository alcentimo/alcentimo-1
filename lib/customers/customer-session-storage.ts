export interface StoredCustomerSession {
  userId: string | null;
  displayName: string;
  phone: string | null;
  contactEmail: string | null;
  updatedAt: string;
}

function isValidStoredPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && phone.trim().length >= 10;
}

function isValidStoredEmail(email: string | null | undefined): boolean {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
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

    const parsed = JSON.parse(raw) as StoredCustomerSession & { phone?: string };
    if (!parsed || typeof parsed.displayName !== "string") {
      return null;
    }

    const displayName = parsed.displayName.trim();
    const phone =
      typeof parsed.phone === "string" && parsed.phone.trim()
        ? parsed.phone.trim()
        : null;
    const contactEmail =
      typeof parsed.contactEmail === "string" && parsed.contactEmail.trim()
        ? parsed.contactEmail.trim()
        : null;

    if (
      displayName.length < 2 ||
      (!isValidStoredPhone(phone) && !isValidStoredEmail(contactEmail))
    ) {
      return null;
    }

    return {
      userId: parsed.userId ?? null,
      displayName,
      phone,
      contactEmail,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeStoredCustomerSession(
  storeSlug: string,
  session: Pick<
    StoredCustomerSession,
    "userId" | "displayName" | "phone" | "contactEmail"
  >,
): void {
  if (typeof window === "undefined") return;

  const payload: StoredCustomerSession = {
    userId: session.userId,
    displayName: session.displayName.trim(),
    phone: session.phone?.trim() || null,
    contactEmail: session.contactEmail?.trim() || null,
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
