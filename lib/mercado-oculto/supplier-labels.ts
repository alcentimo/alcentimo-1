import type { User } from "@supabase/supabase-js";
import { normalizeSupportEmail } from "@/lib/support/admin-access";

const META_KEYS = [
  "business_name",
  "company_name",
  "company",
  "store_name",
  "full_name",
  "name",
] as const;

function readMetaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}

function titleCaseHandle(raw: string): string {
  return raw
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 60);
}

/** Nombre comercial visible en vitrina, filtros y carrito. */
export function resolveMayoristaDisplayName(
  user:
    | Pick<User, "email" | "user_metadata">
    | null
    | undefined,
  options?: { isSupportAdmin?: boolean },
): string {
  const meta =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  for (const key of META_KEYS) {
    const fromMeta = readMetaString(meta, key);
    if (fromMeta) return fromMeta;
  }

  if (options?.isSupportAdmin) {
    return "Alcéntimo Oficial";
  }

  const email = normalizeSupportEmail(user?.email);
  if (!email) return "Mayorista Oficial Alcéntimo";

  const local = email.split("@")[0] ?? email;
  const nice = titleCaseHandle(local);
  return nice ? `Mayorista ${nice}` : "Mayorista Oficial Alcéntimo";
}
