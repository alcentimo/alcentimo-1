"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Loader2,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createOnboardingSampleProducts } from "@/lib/onboarding/sample-products-actions";
import {
  dismissOnboardingChecklist,
  isShareLinkStepCompleted,
  markShareLinkStepCompleted,
} from "@/lib/onboarding/client-storage";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { cn } from "@/lib/cn";

interface OnboardingChecklistProps {
  storeId: string;
  storeName: string;
  rubroLabel: string;
  setupStatus: OnboardingSetupStatus;
  onOpenCreateProduct: () => void;
  onOpenImport: () => void;
  onSampleProductsCreated: () => void;
}

type ChecklistStepId = "products" | "payments" | "share";

interface ChecklistStep {
  id: ChecklistStepId;
  title: string;
  description: string;
  done: boolean;
}

export function OnboardingChecklist({
  storeId,
  storeName,
  rubroLabel,
  setupStatus,
  onOpenCreateProduct,
  onOpenImport,
  onSampleProductsCreated,
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [sampleSuccess, setSampleSuccess] = useState<string | null>(null);
  const [shareDone, setShareDone] = useState(() => isShareLinkStepCompleted(storeId));
  const [creatingSamples, startCreateSamples] = useTransition();

  const catalogUrl = useMemo(() => {
    if (typeof window === "undefined") return setupStatus.catalogPath;
    return new URL(setupStatus.catalogPath, window.location.origin).toString();
  }, [setupStatus.catalogPath]);

  const steps = useMemo<ChecklistStep[]>(
    () => [
      {
        id: "products",
        title: "Crear productos",
        description: "Publica tu catálogo con productos reales o de ejemplo.",
        done: setupStatus.hasProducts,
      },
      {
        id: "payments",
        title: "Configurar pagos y envíos",
        description: "Define cómo te pagan y cómo entregas los pedidos.",
        done: setupStatus.paymentsOrShippingConfigured,
      },
      {
        id: "share",
        title: "Compartir enlace",
        description: "Envía tu catálogo por WhatsApp o redes sociales.",
        done: shareDone,
      },
    ],
    [setupStatus.hasProducts, setupStatus.paymentsOrShippingConfigured, shareDone],
  );

  const completedCount = steps.filter((step) => step.done).length;
  const allDone = completedCount === steps.length;

  const handleDismiss = useCallback(() => {
    dismissOnboardingChecklist(storeId);
    window.dispatchEvent(new CustomEvent("alcentimo:onboarding-checklist-dismissed"));
  }, [storeId]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setShareCopied(true);
      markShareLinkStepCompleted(storeId);
      setShareDone(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareCopied(false);
    }
  }, [catalogUrl, storeId]);

  const handleCreateSamples = useCallback(() => {
    setSampleError(null);
    setSampleSuccess(null);
    startCreateSamples(async () => {
      const result = await createOnboardingSampleProducts();
      if (!result.ok) {
        setSampleError(result.error);
        return;
      }
      setSampleSuccess(
        result.created === 1
          ? "Se agregó 1 producto de ejemplo."
          : `Se agregaron ${result.created} productos de ejemplo.`,
      );
      onSampleProductsCreated();
    });
  }, [onSampleProductsCreated]);

  if (allDone) return null;

  return (
    <aside
      className={cn(
        "onboarding-checklist",
        collapsed && "onboarding-checklist-collapsed",
      )}
      aria-label="Primeros pasos de configuración"
    >
      <div className="onboarding-checklist-header">
        <div className="min-w-0">
          <p className="onboarding-checklist-eyebrow">Configuración inicial</p>
          <h2 className="onboarding-checklist-title">{storeName}</h2>
          <p className="onboarding-checklist-progress">
            {completedCount} de {steps.length} pasos completados
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="onboarding-checklist-icon-btn"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir checklist" : "Minimizar checklist"}
          >
            {collapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="onboarding-checklist-icon-btn"
            onClick={handleDismiss}
            aria-label="Ocultar checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="onboarding-checklist-body">
          <ol className="onboarding-checklist-steps">
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "onboarding-checklist-step",
                  step.done && "onboarding-checklist-step-done",
                )}
              >
                <span className="onboarding-checklist-step-icon" aria-hidden="true">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="onboarding-checklist-step-title">{step.title}</p>
                  <p className="onboarding-checklist-step-copy">{step.description}</p>

                  {step.id === "products" && !step.done ? (
                    <div className="onboarding-checklist-actions">
                      <Button
                        type="button"
                        size="sm"
                        className="btn-brand h-8"
                        onClick={onOpenCreateProduct}
                      >
                        Crear producto
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={onOpenImport}
                      >
                        Importar Excel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        disabled={creatingSamples}
                        onClick={handleCreateSamples}
                      >
                        {creatingSamples ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Ejemplos IA ({rubroLabel})
                      </Button>
                    </div>
                  ) : null}

                  {step.id === "payments" && !step.done ? (
                    <div className="onboarding-checklist-actions">
                      <Link
                        href="/dashboard/ajustes?tab=payments"
                        className="onboarding-checklist-link"
                      >
                        Configurar pagos
                      </Link>
                      <Link
                        href="/dashboard/ajustes?tab=shipping"
                        className="onboarding-checklist-link"
                      >
                        Configurar envíos
                      </Link>
                    </div>
                  ) : null}

                  {step.id === "share" && !step.done ? (
                    <div className="onboarding-checklist-actions">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => void handleCopyLink()}
                      >
                        {shareCopied ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {shareCopied ? "Enlace copiado" : "Copiar enlace"}
                      </Button>
                      <a
                        href={setupStatus.catalogPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="onboarding-checklist-link inline-flex items-center gap-1"
                        onClick={() => {
                          markShareLinkStepCompleted(storeId);
                          setShareDone(true);
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Ver catálogo
                      </a>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {sampleError ? (
            <p className="onboarding-checklist-feedback onboarding-checklist-feedback-error">
              {sampleError}
            </p>
          ) : null}
          {sampleSuccess ? (
            <p className="onboarding-checklist-feedback onboarding-checklist-feedback-success">
              {sampleSuccess}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
