import type { OnboardingSampleProductDraft } from "@/lib/ai/onboarding-assistant-types";
import type { StoreRubro } from "@/src/config/categories";

const STORAGE_KEY = "alcentimo-landing-instant-store-draft";

export interface LandingInstantStoreDraft {
  businessHint: string;
  storeName: string;
  rubro: StoreRubro;
  rubroLabel: string;
  intro: string;
  products: OnboardingSampleProductDraft[];
  createdAt: number;
}

export function readLandingInstantStoreDraft(): LandingInstantStoreDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LandingInstantStoreDraft;
    if (!parsed?.storeName || !Array.isArray(parsed.products) || parsed.products.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLandingInstantStoreDraft(draft: LandingInstantStoreDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function clearLandingInstantStoreDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
