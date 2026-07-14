export const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidStoreSlug(slug: string): boolean {
  return STORE_SLUG_PATTERN.test(slug.trim());
}
