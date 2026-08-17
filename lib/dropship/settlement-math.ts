import { roundMoneyDisplay } from "@/lib/format";

export const DEFAULT_DROPSHIP_PLATFORM_MARKUP_PERCENT = 5;

export function normalizeMarkupPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_DROPSHIP_PLATFORM_MARKUP_PERCENT;
  }
  return Math.min(100, roundMoneyDisplay(parsed));
}

export function computePlatformMarkupUsd(
  wholesaleCostUsd: number,
  markupPercent: number,
): number {
  const cost = Math.max(0, Number(wholesaleCostUsd) || 0);
  const percent = normalizeMarkupPercent(markupPercent);
  return roundMoneyDisplay(cost * (percent / 100));
}

export function computeAmountDueUsd(
  wholesaleCostUsd: number,
  markupPercent: number,
): { wholesaleCostUsd: number; platformMarkupUsd: number; amountDueUsd: number } {
  const wholesale = roundMoneyDisplay(Math.max(0, Number(wholesaleCostUsd) || 0));
  const platformMarkupUsd = computePlatformMarkupUsd(wholesale, markupPercent);
  return {
    wholesaleCostUsd: wholesale,
    platformMarkupUsd,
    amountDueUsd: roundMoneyDisplay(wholesale + platformMarkupUsd),
  };
}
