/** Par nonce sin hash (Supabase) + hash SHA-256 hex (Google GIS). */
export async function generateGoogleNoncePair(): Promise<[string, string]> {
  const raw = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashed = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return [raw, hashed];
}
