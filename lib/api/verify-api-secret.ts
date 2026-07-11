/**
 * Valida solicitudes de APIs externas (POS, importadores CSV, etc.).
 * Acepta `Authorization: Bearer <key>` o header `X-API-Key`.
 */
export function verifyApiSecret(request: Request): boolean {
  const secret = process.env.API_SECRET_KEY?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length) === secret;
  }

  const apiKey = request.headers.get("x-api-key");
  return apiKey === secret;
}

export function isApiSecretConfigured(): boolean {
  return Boolean(process.env.API_SECRET_KEY?.trim());
}
