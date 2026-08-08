export const CUSTOMER_PHONE_AUTH_EMAIL_DOMAIN = "customers.phone.alcentimo.com";
export const CUSTOMER_MIN_PASSWORD_LENGTH = 8;
export const CUSTOMER_PASSWORD_SET_META_KEY = "customer_password_set";

export type CustomerAuthMethod = "phone" | "email";

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normaliza teléfonos VE a formato local uniforme con cero inicial.
 * Acepta 0412…, 412…, +58 412… / 58412… y limpia espacios/símbolos.
 */
export function normalizeCustomerPhone(phone: string): string {
  let digits = normalizePhoneDigits(phone);

  // Código de país Venezuela (+58 / 58)
  if (digits.startsWith("0058") && digits.length >= 14) {
    digits = digits.slice(4);
  } else if (digits.startsWith("58") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Móvil local sin cero: 412… (10 dígitos) → 0412…
  if (digits.length === 10 && digits.startsWith("4")) {
    digits = `0${digits}`;
  }

  return digits;
}

export function isValidCustomerPhone(phone: string): boolean {
  const digits = normalizeCustomerPhone(phone);
  // Tras normalizar: 0412… = 11 dígitos; otros internacionales 10–15
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidCustomerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeCustomerEmail(email));
}

export function buildCustomerAuthEmail(phone: string): string {
  const digits = normalizeCustomerPhone(phone);
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

/** Método de acceso según el email Auth del usuario. */
export function resolveCustomerAuthMethod(
  authEmail: string | null | undefined,
): CustomerAuthMethod {
  return isSyntheticCustomerAuthEmail(authEmail) ? "phone" : "email";
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

/** Teléfono embebido en el email Auth sintético (`0412…@customers.phone…`). */
export function resolvePhoneFromSyntheticAuthEmail(
  authEmail: string | null | undefined,
): string | null {
  if (!isSyntheticCustomerAuthEmail(authEmail)) return null;
  const localPart = authEmail!.split("@")[0]?.trim() ?? "";
  if (!localPart || !isValidCustomerPhone(localPart)) return null;
  return normalizeCustomerPhone(localPart).slice(0, 40);
}

/** Nombre visible desde metadata Auth (perfil de tienda puede estar incompleto). */
export function resolveCustomerDisplayNameFromAuth(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  const fromDisplay =
    typeof metadata.display_name === "string" ? metadata.display_name.trim() : "";
  if (fromDisplay.length >= 2) return fromDisplay.slice(0, 120);

  const fromFull =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  if (fromFull.length >= 2) return fromFull.slice(0, 120);

  const contactEmail = resolveCustomerContactEmail(user.email, metadata);
  const emailLocal = contactEmail?.split("@")[0]?.trim();
  return emailLocal && emailLocal.length >= 2 ? emailLocal.slice(0, 120) : null;
}

/** Teléfono desde metadata Auth o email sintético de login por teléfono. */
export function resolveCustomerPhoneFromAuth(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const metadata = user.user_metadata ?? {};
  if (typeof metadata.phone === "string" && metadata.phone.trim()) {
    const normalized = normalizeCustomerPhone(metadata.phone);
    if (isValidCustomerPhone(normalized)) {
      return normalized.slice(0, 40);
    }
  }

  return resolvePhoneFromSyntheticAuthEmail(user.email);
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

export function validateCustomerEmailInput(email: string):
  | { ok: true; email: string }
  | { ok: false; error: string } {
  const normalized = normalizeCustomerEmail(email);
  if (!isValidCustomerEmail(normalized)) {
    return { ok: false, error: "Indica un correo electrónico válido." };
  }
  if (isSyntheticCustomerAuthEmail(normalized)) {
    return { ok: false, error: "Indica un correo electrónico válido." };
  }
  return { ok: true, email: normalized.slice(0, 254) };
}

export function validateCustomerPhoneInput(phone: string):
  | { ok: true; phone: string }
  | { ok: false; error: string } {
  const normalized = normalizeCustomerPhone(phone);

  if (!isValidCustomerPhone(normalized)) {
    return {
      ok: false,
      error: "Indica un teléfono válido (ej. 0412… o 412…).",
    };
  }

  return { ok: true, phone: normalized.slice(0, 40) };
}

/** Resuelve el email Auth interno (sintético o real) según el método elegido. */
export function resolveCustomerAuthCredentials(input: {
  method: CustomerAuthMethod;
  phone?: string | null;
  email?: string | null;
}):
  | {
      ok: true;
      method: CustomerAuthMethod;
      authEmail: string;
      phone: string | null;
      contactEmail: string | null;
    }
  | { ok: false; error: string } {
  if (input.method === "phone") {
    const phoneValidation = validateCustomerPhoneInput(input.phone ?? "");
    if (!phoneValidation.ok) return phoneValidation;

    let contactEmail: string | null = null;
    if (input.email?.trim()) {
      const emailValidation = validateCustomerEmailInput(input.email);
      if (!emailValidation.ok) return emailValidation;
      contactEmail = emailValidation.email;
    }

    return {
      ok: true,
      method: "phone",
      authEmail: buildCustomerAuthEmail(phoneValidation.phone),
      phone: phoneValidation.phone,
      contactEmail,
    };
  }

  const emailValidation = validateCustomerEmailInput(input.email ?? "");
  if (!emailValidation.ok) return emailValidation;

  let phone: string | null = null;
  if (input.phone?.trim()) {
    const phoneValidation = validateCustomerPhoneInput(input.phone);
    if (!phoneValidation.ok) return phoneValidation;
    phone = phoneValidation.phone;
  }

  return {
    ok: true,
    method: "email",
    authEmail: emailValidation.email,
    phone,
    contactEmail: emailValidation.email,
  };
}

export function validateCustomerRegistrationInput(input: {
  displayName: string;
  method?: CustomerAuthMethod;
  phone?: string | null;
  email?: string | null;
  password?: string;
  confirmPassword?: string;
  requirePassword?: boolean;
}):
  | {
      ok: true;
      displayName: string;
      method: CustomerAuthMethod;
      authEmail: string;
      phone: string | null;
      contactEmail: string | null;
      password: string | null;
    }
  | { ok: false; error: string } {
  const displayName = input.displayName.trim();
  const method = input.method ?? "phone";
  const requirePassword = input.requirePassword !== false;

  if (!displayName || displayName.length < 2) {
    return { ok: false, error: "Indica tu nombre (mínimo 2 caracteres)." };
  }

  const credentials = resolveCustomerAuthCredentials({
    method,
    phone: input.phone,
    email: input.email,
  });
  if (!credentials.ok) return credentials;

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
    method: credentials.method,
    authEmail: credentials.authEmail,
    phone: credentials.phone,
    contactEmail: credentials.contactEmail,
    password,
  };
}
