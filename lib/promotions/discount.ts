export function calculatePromotionDiscountUsd(
  subtotalUsd: number,
  discountPercent: number,
): number {
  if (subtotalUsd <= 0 || discountPercent <= 0) return 0;
  const discount = subtotalUsd * (discountPercent / 100);
  return Math.min(discount, subtotalUsd);
}
