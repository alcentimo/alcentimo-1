/**
 * Resuelve una promesa con tope de tiempo. Si vence o falla, devuelve `fallback`.
 * No cancela la promesa original (útil para no abortar queries de Supabase a medias).
 */
export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(label ? `timeout:${label}` : `timeout:${ms}ms`));
        }, ms);
      }),
    ]);
  } catch (error) {
    if (label) {
      console.error(`[withTimeoutFallback] ${label}`, error);
    }
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
