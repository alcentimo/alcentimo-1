/** PostgREST recorta lecturas a ~1000 filas si no se pagina el `.select()`. */
export const SUPABASE_SELECT_PAGE_SIZE = 1000;

/**
 * Recorre un `.select()` de Supabase con `.range()` hasta agotar filas.
 * `runPage` debe aplicar `.order()` estable antes de `.range(from, to)`.
 */
export async function fetchAllPagedRows(
  runPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  pageSize = SUPABASE_SELECT_PAGE_SIZE,
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await runPage(from, from + pageSize - 1);
    if (error) return { rows, error: error.message };
    const chunk = (data as Record<string, unknown>[] | null) ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return { rows };
}
