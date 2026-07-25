"use client";

import { FileSpreadsheet, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createOnboardingSampleProducts } from "@/lib/onboarding/sample-products-actions";
import { dismissCatalogEmptyGuide } from "@/lib/onboarding/client-storage";

interface CatalogEmptyOnboardingBannerProps {
  storeId: string;
  storeName: string;
  rubroLabel: string;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onSampleProductsCreated: () => void;
  onDismiss: () => void;
}

export function CatalogEmptyOnboardingBanner({
  storeId,
  storeName,
  rubroLabel,
  onOpenCreate,
  onOpenImport,
  onSampleProductsCreated,
  onDismiss,
}: CatalogEmptyOnboardingBannerProps) {
  const [creatingSamples, startCreateSamples] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDismiss = useCallback(() => {
    dismissCatalogEmptyGuide(storeId);
    onDismiss();
  }, [onDismiss, storeId]);

  const handleCreateSamples = useCallback(() => {
    setFeedback(null);
    setError(null);
    startCreateSamples(async () => {
      const result = await createOnboardingSampleProducts();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFeedback(
        result.created === 1
          ? "Listo: agregamos 1 producto de ejemplo a tu catálogo."
          : `Listo: agregamos ${result.created} productos de ejemplo a tu catálogo.`,
      );
      onSampleProductsCreated();
    });
  }, [onSampleProductsCreated]);

  return (
    <div className="onboarding-empty-banner" role="region" aria-label="Guía para empezar">
      <button
        type="button"
        onClick={handleDismiss}
        className="onboarding-empty-banner-dismiss"
        aria-label="Ocultar guía"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="onboarding-empty-banner-content">
        <div className="onboarding-empty-banner-icon" aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="onboarding-empty-banner-title">
            Tu catálogo de {storeName} está vacío
          </h2>
          <p className="onboarding-empty-banner-copy">
            El asistente puede ayudarte a dar el primer paso. Elige cómo quieres empezar
            con productos para tu rubro de {rubroLabel}.
          </p>

          <div className="onboarding-empty-banner-actions">
            <Button type="button" className="btn-brand" onClick={onOpenImport}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Importar desde Excel
            </Button>
            <Button type="button" variant="outline" onClick={onOpenCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear mi primer producto
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={creatingSamples}
              onClick={handleCreateSamples}
              className="gap-1.5"
            >
              {creatingSamples ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Crear con ayuda de IA
            </Button>
          </div>

          {feedback ? (
            <p className="onboarding-empty-banner-feedback onboarding-empty-banner-feedback-success">
              {feedback}
            </p>
          ) : null}
          {error ? (
            <p className="onboarding-empty-banner-feedback onboarding-empty-banner-feedback-error">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
