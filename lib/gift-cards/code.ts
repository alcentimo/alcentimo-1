export function normalizeGiftCardCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateGiftCardCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }
  return `GC-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function roundGiftUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function giftCardApplyAmount(
  currentBalanceUsd: number,
  orderTotalUsd: number,
): number {
  return roundGiftUsd(
    Math.min(Math.max(0, currentBalanceUsd), Math.max(0, orderTotalUsd)),
  );
}
