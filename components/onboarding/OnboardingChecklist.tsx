"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  dismissOnboardingChecklist,
  isShareLinkStepCompleted,
  markShareLinkStepCompleted,
} from "@/lib/onboarding/client-storage";
import type { OnboardingSetupStatus } from "@/lib/onboarding/setup-status";
import { cn } from "@/lib/cn";

interface OnboardingChecklistProps {
  storeId: string;
  storeName?: string;
  setupStatus: OnboardingSetupStatus;
  /** Pista breve tras el primer ingreso (sin modal). */
  welcomeHint?: boolean;
  onOpenCreateProduct: () => void;
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
  setupStatus,
  welcomeHint = false,
  onOpenCreateProduct,
}: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareDone, setShareDone] = useState(() =>
    isShareLinkStepCompleted(storeId),
  );

  const catalogUrl = useMemo(() => {
    if (typeof window === "undefined") return setupStatus.catalogPath;
    return new URL(setupStatus.catalogPath, window.location.origin).toString();
  }, [setupStatus.catalogPath]);

  const steps = useMemo<ChecklistStep[]>(
    () => [
      {
        id: "products",
        title: "Crear productos",
        description: "Publica tu catálogo con productos reales.",
        done: setupStatus.hasProducts,
      },
      {
        id: "payments",
        title: "Configurar métodos de pago",
        description:
          "Activa al menos un método para que tus clientes puedan pagarte.",
        done: setupStatus.hasPaymentsConfigured,
      },
      {
        id: "share",
        title: "Compartir enlace",
        description: "Envía tu catálogo por WhatsApp o redes sociales.",
        done: shareDone,
      },
    ],
    [setupStatus.hasProducts, setupStatus.hasPaymentsConfigured, shareDone],
  );

  const completedCount = steps.filter((step) => step.done).length;
  const allDone = completedCount === steps.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = useCallback(() => {
    dismissOnboardingChecklist(storeId);
    window.dispatchEvent(
      new CustomEvent("alcentimo:onboarding-checklist-dismissed"),
    );
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
        <button
          type="button"
          className="onboarding-checklist-summary"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
        >
          <p className="onboarding-checklist-eyebrow">
            {welcomeHint
              ? storeName
                ? `Bienvenido/a, ${storeName}`
                : "Bienvenido/a"
              : "Primeros pasos"}
          </p>
          <p className="onboarding-checklist-progress">
            {completedCount}/{steps.length} listos
          </p>
          <div
            className="onboarding-checklist-bar"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-label="Progreso de configuración"
          >
            <span
              className="onboarding-checklist-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="onboarding-checklist-icon-btn"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Ver pasos" : "Minimizar"}
          >
            {collapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            className="onboarding-checklist-icon-btn"
            onClick={handleDismiss}
            aria-label="Ocultar primeros pasos"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="onboarding-checklist-body">
          {welcomeHint ? (
            <p className="onboarding-checklist-hint">
              Empieza cuando quieras: el catálogo y los botones siguen
              disponibles.
            </p>
          ) : null}
          <ol className="onboarding-checklist-steps">
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  "onboarding-checklist-step",
                  step.done && "onboarding-checklist-step-done",
                )}
              >
                <span
                  className="onboarding-checklist-step-icon"
                  aria-hidden="true"
                >
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="onboarding-checklist-step-title">{step.title}</p>
                  <p className="onboarding-checklist-step-copy">
                    {step.description}
                  </p>

                  {step.id === "products" && !step.done ? (
                    <div className="onboarding-checklist-actions">
                      <Button
                        type="button"
                        size="sm"
                        className="btn-brand h-7 text-[11px]"
                        onClick={onOpenCreateProduct}
                      >
                        Crear producto
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
                        className="h-7 gap-1.5 text-[11px]"
                        onClick={() => void handleCopyLink()}
                      >
                        {shareCopied ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {shareCopied ? "Copiado" : "Copiar enlace"}
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
                        <Share2 className="h-3 w-3" />
                        Ver catálogo
                      </a>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
