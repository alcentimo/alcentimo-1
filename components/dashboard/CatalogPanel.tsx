"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AvailableProductsPanel } from "@/components/dashboard/AvailableProductsPanel";
import { OnboardingExperience } from "@/components/onboarding/OnboardingExperience";
import type { Store } from "@/lib/database.types";
import type { StoreProductLimitContext } from "@/lib/plans/product-limit";
import type { InventoryAiSuggestionRow } from "@/lib/inventory-ai/types";
import { InventoryAiSuggestionCards } from "@/components/dashboard/InventoryAiSuggestionCards";
import { requestDashboardShellRefresh } from "@/lib/dashboard/shell-refresh";

interface CatalogPanelProps {
  store: Store;
  productLimitContext?: StoreProductLimitContext | null;
  showWelcomeFromUrl?: boolean;
  inventorySuggestions?: InventoryAiSuggestionRow[];
}

/**
 * Catálogo dropshipping puro: selector del hub mayorista.
 * Sin pestaña «Mi tienda» ni alta/edición manual de productos.
 */
export function CatalogPanel({
  store,
  productLimitContext = null,
  showWelcomeFromUrl = false,
  inventorySuggestions = [],
}: CatalogPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    requestDashboardShellRefresh();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    let changed = false;

    if (params.get("tab") === "ajustes") {
      router.replace("/dashboard/ajustes");
      return;
    }

    if (params.get("tab")) {
      params.delete("tab");
      changed = true;
    }

    // Vistas legacy de inventario interno → selector mayorista.
    if (
      params.get("vista") === "tienda" ||
      params.get("vista") === "mi-tienda" ||
      params.get("nuevo") === "1"
    ) {
      params.delete("nuevo");
      params.delete("vista");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(
        query ? `/dashboard/catalogo?${query}` : "/dashboard/catalogo",
        { scroll: false },
      );
    }
  }, [searchParamsKey, router]);

  const trial = productLimitContext?.trial ?? null;
  const trialActive = trial?.active ?? false;

  return (
    <>
      <Suspense fallback={null}>
        <OnboardingExperience
          storeId={store.id}
          showWelcomeFromUrl={showWelcomeFromUrl}
          trialActive={trialActive}
        />
      </Suspense>

      <InventoryAiSuggestionCards
        initialSuggestions={inventorySuggestions}
        variant="compact"
      />

      <AvailableProductsPanel
        onImported={() => {
          router.refresh();
        }}
      />
    </>
  );
}
