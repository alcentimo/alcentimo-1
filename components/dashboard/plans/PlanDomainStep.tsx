"use client";

import { useMemo, useState } from "react";
import { Check, Globe, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ANNUAL_DOMAIN_PROMO_LABEL,
  showsAnnualDomainPromo,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import {
  normalizeCustomDomain,
  validateCustomDomainInput,
} from "@/lib/domains/custom-domain";
import { cn } from "@/lib/cn";

export type DomainSetupMode = "connect" | "purchase";

export interface PlanDomainSelection {
  domain: string | null;
  mode: DomainSetupMode;
}

interface PlanDomainStepProps {
  tier: PlanPricingTier;
  billing: BillingPeriod;
  onContinue: (selection: PlanDomainSelection) => void;
  onSkip: () => void;
}

function buildSuggestedDomain(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");

  if (!cleaned) return "";
  if (cleaned.includes(".")) return cleaned;
  return `${cleaned}.com`;
}

export function PlanDomainStep({
  tier,
  billing,
  onContinue,
  onSkip,
}: PlanDomainStepProps) {
  const [mode, setMode] = useState<DomainSetupMode>("connect");
  const [domainInput, setDomainInput] = useState("");
  const showAnnualPromo = showsAnnualDomainPromo(tier.planId, billing);

  const normalizedDomain = useMemo(() => {
    const value = buildSuggestedDomain(domainInput);
    return normalizeCustomDomain(value);
  }, [domainInput]);

  const validation = useMemo(() => {
    if (!domainInput.trim()) {
      return { valid: false, error: null as string | null };
    }
    const result = validateCustomDomainInput(buildSuggestedDomain(domainInput));
    if (result.error) {
      return { valid: false, error: result.error };
    }
    return { valid: Boolean(result.domain), error: null };
  }, [domainInput]);

  function handleContinue() {
    if (!validation.valid || !normalizedDomain) return;
    onContinue({ domain: normalizedDomain, mode });
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 text-center sm:text-left">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 sm:mx-0 dark:bg-teal-950/40 dark:text-teal-300">
          <Globe className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Configura tu dominio de marca
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          El plan {tier.displayName} incluye{" "}
          <strong>dominio personalizado (.com incluido / conectable)</strong>.
          Elige si conectarás uno existente o si quieres que te ayudemos con uno
          nuevo.
        </p>
        {showAnnualPromo ? (
          <p className="plan-domain-promo-badge mt-4 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            {ANNUAL_DOMAIN_PROMO_LABEL}
          </p>
        ) : null}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("connect")}
          className={cn(
            "rounded-xl border px-4 py-3 text-left transition",
            mode === "connect"
              ? "border-teal-400 bg-teal-50/70 ring-1 ring-teal-500/20 dark:border-teal-700 dark:bg-teal-950/30 dark:ring-teal-500/30"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700",
          )}
        >
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Ya tengo dominio
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Conecta tutienda.com o tienda.tudominio.com con DNS.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("purchase")}
          className={cn(
            "rounded-xl border px-4 py-3 text-left transition",
            mode === "purchase"
              ? "border-teal-400 bg-teal-50/70 ring-1 ring-teal-500/20 dark:border-teal-700 dark:bg-teal-950/30 dark:ring-teal-500/30"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700",
          )}
        >
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Quiero un .com nuevo
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {showAnnualPromo
              ? "Registro y conexión incluidos el primer año con plan anual."
              : "Te ayudamos a registrar y conectar tu dominio."}
          </p>
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
        <Label htmlFor="plan-domain-input" className="payment-field-label">
          {mode === "purchase" ? "Nombre deseado para tu .com" : "Tu dominio"}
        </Label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            id="plan-domain-input"
            type="text"
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder={mode === "purchase" ? "mitienda" : "mitienda.com"}
            className="payment-field-input pl-9"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {domainInput.trim() ? (
          <div className="mt-3">
            {validation.valid && normalizedDomain ? (
              <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {normalizedDomain} — listo para{" "}
                {mode === "purchase" ? "registrar y conectar" : "conectar"} tras
                activar tu plan
              </p>
            ) : validation.error ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {validation.error}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {mode === "purchase"
              ? "Escribe el nombre de tu marca; agregamos .com automáticamente si no incluyes extensión."
              : "Ingresa el dominio que ya posees (ej. tutienda.com)."}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onSkip}>
          Configurar después
        </Button>
        <Button
          type="button"
          className="btn-brand"
          onClick={handleContinue}
          disabled={!validation.valid || !normalizedDomain}
        >
          Continuar al pago
        </Button>
      </div>
    </div>
  );
}
