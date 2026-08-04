import { createHash } from "crypto";

export const CATALOG_ACCESS_MODES = [
  "public",
  "draft",
  "private",
  "password",
] as const;

export type CatalogAccessMode = (typeof CATALOG_ACCESS_MODES)[number];

export interface CatalogAccessSettings {
  mode: CatalogAccessMode;
}

export const CATALOG_ACCESS_MODE_LABELS: Record<CatalogAccessMode, string> = {
  public: "Público",
  draft: "Borrador",
  private: "Privado",
  password: "Protegido con contraseña",
};

export function defaultCatalogAccessSettings(): CatalogAccessSettings {
  return { mode: "public" };
}

export function isCatalogAccessMode(value: unknown): value is CatalogAccessMode {
  return (
    value === "public" ||
    value === "draft" ||
    value === "private" ||
    value === "password"
  );
}

export function normalizeCatalogAccessSettings(
  raw: unknown,
): CatalogAccessSettings {
  if (!raw || typeof raw !== "object") {
    return defaultCatalogAccessSettings();
  }
  const record = raw as Record<string, unknown>;
  return {
    mode: isCatalogAccessMode(record.mode) ? record.mode : "public",
  };
}

export function hashCatalogPassword(password: string, storeId: string): string {
  return createHash("sha256")
    .update(`${storeId}:${password.trim()}`, "utf8")
    .digest("hex");
}

export function catalogUnlockToken(
  storeId: string,
  passwordHash: string,
): string {
  return createHash("sha256")
    .update(`unlock:${storeId}:${passwordHash}`, "utf8")
    .digest("hex");
}

export function catalogUnlockCookieName(storeId: string): string {
  return `alc_cat_unlock_${storeId.replace(/-/g, "")}`;
}

export function isRestrictedCatalogAccessMode(mode: CatalogAccessMode): boolean {
  return mode !== "public";
}
