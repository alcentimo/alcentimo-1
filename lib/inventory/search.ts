/** Escapa comodines y caracteres que rompen filtros PostgREST `.or()`. */
export function sanitizeInventorySearch(raw: string): string {
  return raw
    .trim()
    .slice(0, 80)
    .replace(/[%_,.()\"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildInventorySearchOrFilter(query: string): string | null {
  const sanitized = sanitizeInventorySearch(query);
  if (!sanitized) return null;

  const pattern = `"%${sanitized}%"`;
  return `product_name.ilike.${pattern},default_sku.ilike.${pattern},product_slug.ilike.${pattern}`;
}

/** Ventana de páginas para la UI (números + elipsis). */
export function getInventoryPageItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let delta = 1; delta <= 1; delta += 1) {
    pages.add(currentPage - delta);
    pages.add(currentPage + delta);
  }

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    previous = page;
  }
  return items;
}
