import type { OnboardingSampleProductDraft } from "@/lib/ai/onboarding-assistant-types";
import type { StoreRubro } from "@/src/config/categories";

export interface LandingInstantStoreResult {
  storeName: string;
  rubro: StoreRubro;
  rubroLabel: string;
  intro: string;
  products: OnboardingSampleProductDraft[];
}
