/** Client ID web de Google Cloud (público, seguro en el cliente). */
export function getGoogleClientId(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return value || null;
}
