export const CUSTOMER_PHONE_AUTH_EMAIL_DOMAIN = "customers.phone.alcentimo.com";

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidCustomerPhone(phone: string): boolean {
  const digits = normalizePhoneDigits(phone);
  return digits.length >= 10 && digits.length <= 15;
}

export function buildCustomerAuthEmail(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return `${digits}@${CUSTOMER_PHONE_AUTH_EMAIL_DOMAIN}`;
}

export function isSyntheticCustomerAuthEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email
    .toLowerCase()
    .endsWith(`@${CUSTOMER_PHONE_AUTH_EMAIL_DOMAIN}`);
}

export function resolveCustomerContactEmail(
  authEmail: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
): string | null {
  const fromMeta = userMetadata?.contact_email;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  if (authEmail && !isSyntheticCustomerAuthEmail(authEmail)) {
    return authEmail.trim();
  }

  return null;
}

export function validateCustomerRegistrationInput(input: {
  displayName: string;
  phone: string;
  email?: string | null;
}):
  | {
      ok: true;
      displayName: string;
      phone: string;
      contactEmail: string | null;
    }
  | { ok: false; error: string } {
  const displayName = input.displayName.trim();
  const phone = input.phone.trim();
  const contactEmail = input.email?.trim() || null;

  if (!displayName || displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  if (!isValidCustomerPhone(phone)) {
    return {
      ok: false,
      error: "Indica un teléfono WhatsApp válido (mínimo 10 dígitos).",
    };
  }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "El correo indicado no es válido." };
  }

  return {
    ok: true,
    displayName: displayName.slice(0, 120),
    phone: phone.slice(0, 40),
    contactEmail,
  };
}

export function validateCustomerPhoneInput(phone: string):
  | { ok: true; phone: string }
  | { ok: false; error: string } {
  const trimmed = phone.trim();

  if (!isValidCustomerPhone(trimmed)) {
    return {
      ok: false,
      error: "Indica un teléfono WhatsApp válido (mínimo 10 dígitos).",
    };
  }

  return { ok: true, phone: trimmed.slice(0, 40) };
}
