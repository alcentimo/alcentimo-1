import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_PREFIX = "scrypt";

/** Hash scrypt con salt aleatorio (`scrypt$salt$hex`). */
export function hashSupplierPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

/** Verifica contraseña contra hash guardado en supplier_profiles. */
export function verifySupplierPassword(
  password: string,
  passwordHash: string | null | undefined,
): boolean {
  if (!passwordHash?.trim()) return false;

  const parts = passwordHash.trim().split("$");
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX) return false;

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(expectedHex, "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
