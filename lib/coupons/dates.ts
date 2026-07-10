export function parseDateInputToStartIso(dateValue: string): string | null {
  if (!dateValue.trim()) return null;
  return `${dateValue}T00:00:00.000Z`;
}

export function parseDateInputToEndIso(dateValue: string): string | null {
  if (!dateValue.trim()) return null;
  return `${dateValue}T23:59:59.999Z`;
}

export function isCouponNotYetActive(
  startDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!startDate) return false;
  return now.getTime() < new Date(startDate).getTime();
}

export function isCouponExpired(
  endDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endDate) return false;
  return now.getTime() > new Date(endDate).getTime();
}

export function formatCouponDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  return new Date(dateValue).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCouponDateStatus(coupon: {
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
}): "active" | "scheduled" | "expired" | "inactive" {
  if (!coupon.is_active) return "inactive";
  if (isCouponExpired(coupon.end_date)) return "expired";
  if (isCouponNotYetActive(coupon.start_date)) return "scheduled";
  return "active";
}
