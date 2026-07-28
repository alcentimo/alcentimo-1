export const CUSTOMER_PHONE_AUTH_EMAIL_DOMAIN = "customers.phone.alcentimo.com";
export const CUSTOMER_MIN_PASSWORD_LENGTH = 8;
export const CUSTOMER_PASSWORD_SET_META_KEY = "customer_password_set";

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

/**
 * True si el cliente puede gestionar contraseña (login email/teléfono+clave).
 * Falso para OAuth puro (p. ej. solo Google) sin identidad email.
 */
export function customerCanManagePassword(user: {
  email?: string | null;
  identities?: Array<{ provider: string }> | null;
}): boolean {
  if (user.identities && user.identities.length > 0) {
    return user.identities.some((identity) => identity.provider === "email");
  }

  return Boolean(user.email?.trim());
}

export function hasCustomerPasswordSet(
  userMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return userMetadata?.[CUSTOMER_PASSWORD_SET_META_KEY] === true;
}

export function validateCustomerPassword(password: string):
  | { ok: true; password: string }
  | { ok: false; error: string } {
  if (!password || password.length < CUSTOMER_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${CUSTOMER_MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (password.length > 72) {
    return { ok: false, error: "La contraseña es demasiado larga." };
  }

  return { ok: true, password };
}

export function validateCustomerPasswordPair(
  password: string,
  confirmPassword: string,
):
  | { ok: true; password: string }
  | { ok: false; error: string } {
  const validated = validateCustomerPassword(password);
  if (!validated.ok) return validated;

  if (password !== confirmPassword) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  return validated;
}

export function validateCustomerRegistrationInput(input: {
  displayName: string;
  phone: string;
  email?: string | null;
  password?: string;
  confirmPassword?: string;
  requirePassword?: boolean;
}):
  | {
      ok: true;
      displayName: string;
      phone: string;
      contactEmail: string | null;
      password: string | null;
    }
  | { ok: false; error: string } {
  const displayName = input.displayName.trim();
  const phone = input.phone.trim();
  const contactEmail = input.email?.trim() || null;
  const requirePassword = input.requirePassword !== false;

  if (!displayName || displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  if (!isValidCustomerPhone(phone)) {
    return {
      ok: false,
      error: "Indica un teléfono válido (mínimo 10 dígitos).",
    };
  }

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "El correo indicado no es válido." };
  }

  let password: string | null = null;
  if (requirePassword) {
    const passwordValidation = validateCustomerPasswordPair(
      input.password ?? "",
      input.confirmPassword ?? input.password ?? "",
    );
    if (!passwordValidation.ok) {
      return passwordValidation;
    }
    password = passwordValidation.password;
  }

  return {
    ok: true,
    displayName: displayName.slice(0, 120),
    phone: phone.slice(0, 40),
    contactEmail,
    password,
  };
}

export function validateCustomerPhoneInput(phone: string):
  | { ok: true; phone: string }
  | { ok: false; error: string } {
  const trimmed = phone.trim();

  if (!isValidCustomerPhone(trimmed)) {
    return {
      ok: false,
      error: "Indica un teléfono válido (mínimo 10 dígitos).",
    };
  }

  return { ok: true, phone: trimmed.slice(0, 40) };
}
