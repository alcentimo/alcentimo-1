"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Headphones,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { SettingsSection } from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  clearStoreCustomDomainRequest,
  saveStoreCustomDomainRequest,
  verifyStoreCustomDomainRequest,
} from "@/lib/settings/custom-domain-actions";
import type { CustomDomainDnsVerificationResult } from "@/lib/domains/verify-custom-domain-dns";
import { CustomDomainVerificationPanel } from "@/components/dashboard/settings/CustomDomainVerificationPanel";
import {
  getCustomDomainApexATarget,
  getCustomDomainCnameTarget,
  getCustomDomainDnsHostLabel,
  isApexCustomDomain,
} from "@/lib/domains/custom-domain";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { usePlatformSettings } from "@/components/providers/PlatformSettingsProvider";
import { cn } from "@/lib/cn";

interface CustomDomainSectionProps {
  storeSlug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  initialDomain?: string | null;
  initialDomainMode?: "connect" | "purchase" | null;
}

interface DnsRecordRow {
  key: string;
  type: "CNAME" | "A";
  host: string;
  value: string;
  title: string;
  plainHint: string;
}

type ProviderGuideId = "cloudflare" | "godaddy" | "namecheap" | "other";

const VERIFY_STATUS_MESSAGES = [
  "Consultando servidores globales en tiempo real…",
  "Revisando si tu dominio ya apunta a Alcéntimo…",
  "Esto puede tardar unos segundos; no cierres esta página…",
] as const;

const PROVIDER_GUIDES: Array<{
  id: ProviderGuideId;
  label: string;
  steps: string[];
}> = [
  {
    id: "cloudflare",
    label: "Cloudflare",
    steps: [
      "Entra a Cloudflare → tu dominio → DNS.",
      "Pulsa «Añadir registro» y pega los valores de abajo (copia con un clic).",
      "Guarda. Si ves un proxy naranja, déjalo en «Solo DNS» (gris) para dominios personalizados.",
      "Vuelve aquí y pulsa «Comprobar si ya está listo».",
    ],
  },
  {
    id: "godaddy",
    label: "GoDaddy",
    steps: [
      "Entra a GoDaddy → Mis productos → DNS de tu dominio.",
      "Añade un registro nuevo y pega Nombre y Destino de la tarjeta de abajo.",
      "Guarda los cambios (a veces pide confirmar).",
      "Vuelve aquí y pulsa «Comprobar si ya está listo».",
    ],
  },
  {
    id: "namecheap",
    label: "Namecheap",
    steps: [
      "Entra a Namecheap → Domain List → Manage → Advanced DNS.",
      "Añade el registro Host Records con los valores de la tarjeta.",
      "Guarda la fila (el check verde).",
      "Vuelve aquí y pulsa «Comprobar si ya está listo».",
    ],
  },
  {
    id: "other",
    label: "Otro",
    steps: [
      "Abre el panel donde compraste el dominio (busca «DNS» o «Zona DNS»).",
      "Crea un registro nuevo y pega Nombre y Destino de la tarjeta de abajo.",
      "Guarda. Puede tardar desde minutos hasta unas horas en actualizarse.",
      "Vuelve aquí y pulsa «Comprobar si ya está listo».",
    ],
  },
];

function StepPill({
  number,
  label,
  state,
}: {
  number: number;
  label: string;
  state: "done" | "current" | "upcoming";
}) {
  return (
    <div
      className={cn(
        "domain-guide-step-pill",
        state === "done" && "domain-guide-step-pill-done",
        state === "current" && "domain-guide-step-pill-current",
        state === "upcoming" && "domain-guide-step-pill-upcoming",
      )}
    >
      <span className="domain-guide-step-num" aria-hidden="true">
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : number}
      </span>
      <span>{label}</span>
    </div>
  );
}

function CopyChip({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="domain-guide-copy-chip">
      <div className="min-w-0">
        <p className="domain-guide-copy-label">{label}</p>
        <code className="domain-guide-copy-value">{value}</code>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="domain-guide-copy-btn"
        aria-label={`Copiar ${label}`}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function CustomDomainSection({
  storeSlug,
  customDomain,
  customDomainVerified,
  initialDomain = null,
  initialDomainMode = null,
}: CustomDomainSectionProps) {
  const { supportEmail } = usePlatformSettings();
  const [domainInput, setDomainInput] = useState(
    customDomain ?? initialDomain ?? "",
  );
  const [savedDomain, setSavedDomain] = useState(customDomain);
  const [savedVerified, setSavedVerified] = useState(customDomainVerified);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [providerGuide, setProviderGuide] =
    useState<ProviderGuideId>("cloudflare");
  const [verification, setVerification] =
    useState<CustomDomainDnsVerificationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [verifying, setVerifying] = useState(false);
  const [verifyStatusIndex, setVerifyStatusIndex] = useState(0);

  useEffect(() => {
    if (!verifying) {
      setVerifyStatusIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setVerifyStatusIndex(
        (index) => (index + 1) % VERIFY_STATUS_MESSAGES.length,
      );
    }, 2200);

    return () => window.clearInterval(timer);
  }, [verifying]);

  const verifyStatusMessage = VERIFY_STATUS_MESSAGES[verifyStatusIndex];

  const cnameTarget = getCustomDomainCnameTarget();
  const apexTarget = getCustomDomainApexATarget();
  const dnsHost = savedDomain ? getCustomDomainDnsHostLabel(savedDomain) : "www";
  const isApex = savedDomain ? isApexCustomDomain(savedDomain) : false;
  const publicUrl =
    savedDomain && savedVerified
      ? getStoreCatalogPublicUrl(storeSlug, "/", {
          customDomain: savedDomain,
          customDomainVerified: true,
        })
      : null;

  const guideDomain = savedDomain ?? domainInput.trim() ?? "tutienda.com";

  const managedDomainMailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("Dominio personalizado — gestión por Alcentimo")}&body=${encodeURIComponent("Hola, me gustaría que Alcentimo compre o configure mi dominio personalizado para mi tienda.\n\nDominio deseado: \nTienda: " + storeSlug)}`
    : null;

  const hostForGuide = savedDomain ? (isApex ? "www" : dnsHost) : "www";
  const apexLabel = guideDomain.replace(/^www\./, "");
  const showApexARecord = isApex || !savedDomain;
  const dnsRecords: DnsRecordRow[] = [
    {
      key: "cname",
      type: "CNAME",
      host: hostForGuide,
      value: cnameTarget,
      title:
        isApex || !savedDomain
          ? "Versión con www"
          : "Conexión de tu subdominio",
      plainHint:
        isApex || !savedDomain
          ? `Registro CNAME: host www → ${cnameTarget}. No uses un registro A en www.`
          : `Registro CNAME apuntando a ${cnameTarget}.`,
    },
    ...(showApexARecord
      ? [
          {
            key: "a",
            type: "A" as const,
            host: "@",
            value: apexTarget,
            title: "Dominio raíz (@)",
            plainHint: `Registro A: host @ → ${apexTarget} (IP de Vercel). Solo para ${apexLabel} sin www; no uses CNAME en @.`,
          },
        ]
      : []),
  ];

  // Solo un paso "current" a la vez; futuros siempre neutrales.
  const onConnectStep = Boolean(savedDomain) && !savedVerified && !verifying && !verification;
  const onActivateStep = Boolean(savedDomain) && !savedVerified && (verifying || Boolean(verification));

  const step1State: "done" | "current" | "upcoming" = savedDomain
    ? "done"
    : "current";
  const step2State: "done" | "current" | "upcoming" = savedVerified || onActivateStep
    ? "done"
    : onConnectStep
      ? "current"
      : "upcoming";
  const step3State: "done" | "current" | "upcoming" = savedVerified
    ? "done"
    : onActivateStep
      ? "current"
      : "upcoming";

  const activeProvider =
    PROVIDER_GUIDES.find((guide) => guide.id === providerGuide) ??
    PROVIDER_GUIDES[0];

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  }

  function handleSave() {
    setError(null);
    setSuccess(null);
    setVerification(null);

    startTransition(async () => {
      const result = await saveStoreCustomDomainRequest(domainInput);
      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedDomain(result.customDomain ?? null);
      setSavedVerified(Boolean(result.customDomainVerified));
      setDomainInput(result.customDomain ?? "");

      if (result.customDomain) {
        setSuccess(
          "Dominio guardado. Sigue el paso 2 para conectarlo (solo unos minutos).",
        );
      } else {
        setSuccess("Dominio eliminado.");
        setVerification(null);
      }
    });
  }

  async function handleVerifyConnection() {
    const domainToCheck = domainInput.trim();
    if (!domainToCheck) {
      setError("Escribe tu dominio antes de comprobar la conexión.");
      return;
    }

    // Activar carga al instante (fuera de startTransition) para que el botón
    // no se vea “congelado” mientras responde el servidor.
    setError(null);
    setSuccess(null);
    setVerification(null);
    setVerifying(true);
    setVerifyStatusIndex(0);

    try {
      let domainForVerify = savedDomain;

      if (domainToCheck !== savedDomain) {
        const saveResult = await saveStoreCustomDomainRequest(domainInput);
        if (saveResult.error) {
          setError(saveResult.error);
          return;
        }
        domainForVerify = saveResult.customDomain ?? null;
        setSavedDomain(domainForVerify);
        setSavedVerified(false);
        setDomainInput(saveResult.customDomain ?? "");
      }

      if (!domainForVerify) {
        setError("Escribe tu dominio antes de comprobar la conexión.");
        return;
      }

      const result = await verifyStoreCustomDomainRequest(domainForVerify);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.verification) {
        setVerification(result.verification);
      }

      if (result.customDomainVerified) {
        setSavedVerified(true);
        setSuccess("¡Listo! Tu dominio ya está activo en tu tienda.");
      } else if (result.verification && !result.verification.ok) {
        setSuccess(null);
      }
    } finally {
      setVerifying(false);
    }
  }

  function handleClear() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await clearStoreCustomDomainRequest();
      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedDomain(null);
      setSavedVerified(false);
      setDomainInput("");
      setVerification(null);
      setSuccess("Dominio personalizado eliminado.");
    });
  }

  return (
    <SettingsSection
      title="Tu dominio propio"
      description="Haz que tus clientes te encuentren en tutienda.com en lugar del enlace de Alcéntimo. Te guiamos paso a paso."
    >
      {initialDomain && !customDomain ? (
        <div className="domain-guide-callout domain-guide-callout-accent">
          <p className="font-medium">
            Elegiste este dominio al activar tu plan: {initialDomain}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {initialDomainMode === "purchase"
              ? "Guárdalo abajo, cómpralo si aún no lo tienes, y sigue la guía para conectarlo."
              : "Guárdalo abajo y sigue la guía visual para conectarlo."}
          </p>
        </div>
      ) : null}

      <div className="domain-guide-steps" aria-label="Pasos para conectar tu dominio">
        <StepPill number={1} label="Escribe tu dominio" state={step1State} />
        <StepPill number={2} label="Conéctalo" state={step2State} />
        <StepPill number={3} label="Actívalo" state={step3State} />
      </div>

      <div className="space-y-5">
        {/* Paso 1 */}
        <section className="domain-guide-card">
          <div className="domain-guide-card-head">
            <span className="domain-guide-badge">Paso 1</span>
            <h3 className="domain-guide-card-title">Escribe el dominio que quieres usar</h3>
          </div>
          <p className="domain-guide-card-text">
            Puede ser el dominio completo (<strong>tutienda.com</strong>) o un
            subdominio (<strong>tienda.tudominio.com</strong>).
          </p>

          <div className="mt-4">
            <Label htmlFor="custom-domain-input" className="payment-field-label">
              Dominio
            </Label>
            <Input
              id="custom-domain-input"
              type="text"
              placeholder="ejemplo: tutienda.com"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              className="payment-field-input mt-1.5"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={pending || verifying}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                "Guardar y continuar"
              )}
            </Button>
            {savedDomain ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={pending || verifying}
              >
                Quitar dominio
              </Button>
            ) : null}
          </div>
        </section>

        {/* Estado del dominio */}
        {savedDomain ? (
          <div
            className={cn(
              "domain-guide-status",
              savedVerified
                ? "domain-guide-status-ok"
                : "domain-guide-status-pending",
            )}
          >
            <Globe className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium">{savedDomain}</p>
              <p className="mt-1 text-xs opacity-90">
                {savedVerified
                  ? "Activo: tu catálogo ya responde en esta dirección."
                  : "Guardado. Falta conectarlo en el panel donde compraste el dominio (paso 2)."}
              </p>
              {publicUrl ? (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 break-all text-xs font-medium underline underline-offset-2"
                >
                  {publicUrl}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Paso 2 — solo cuando hay dominio guardado y no está verificado */}
        {savedDomain && !savedVerified ? (
          <section className="domain-guide-card domain-guide-card-emphasis">
            <div className="domain-guide-card-head">
              <span className="domain-guide-badge">Paso 2</span>
              <h3 className="domain-guide-card-title">
                Copia estos datos en el panel de tu dominio
              </h3>
            </div>
            <p className="domain-guide-card-text">
              {isApex || !savedDomain ? (
                <>
                  Abre el DNS de tu proveedor y crea exactamente estos registros:
                  <br />
                  <strong>www</strong> → tipo <strong>CNAME</strong> → destino{" "}
                  <strong>{cnameTarget}</strong>
                  <br />
                  <strong>@</strong> (dominio sin www) → tipo <strong>A</strong> →
                  IP <strong>{apexTarget}</strong>
                  <br />
                  No pongas un registro A en www ni un CNAME en @. Suele tardar
                  unos minutos (a veces unas horas).
                </>
              ) : (
                <>
                  Abre el DNS de tu proveedor y crea un registro{" "}
                  <strong>CNAME</strong> apuntando a <strong>{cnameTarget}</strong>.
                  No uses un registro A para este subdominio. Suele tardar unos
                  minutos (a veces unas horas).
                </>
              )}
            </p>

            <div className="domain-guide-provider-tabs" role="tablist" aria-label="Proveedor">
              {PROVIDER_GUIDES.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  role="tab"
                  aria-selected={providerGuide === guide.id}
                  className={cn(
                    "domain-guide-provider-tab",
                    providerGuide === guide.id && "domain-guide-provider-tab-active",
                  )}
                  onClick={() => setProviderGuide(guide.id)}
                >
                  {guide.label}
                </button>
              ))}
            </div>

            <ol className="domain-guide-provider-steps">
              {activeProvider.steps.map((step, index) => (
                <li key={step}>
                  <span className="domain-guide-provider-step-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 space-y-3">
              {dnsRecords.map((record) => (
                <article key={record.key} className="domain-guide-record-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {record.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                        {record.plainHint}
                      </p>
                    </div>
                    <span className="domain-guide-record-type" title="Tipo técnico del registro">
                      {record.type}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <CopyChip
                      label="Nombre / Host"
                      value={record.host}
                      copied={copiedKey === `${record.key}-host`}
                      onCopy={() => copyValue(`${record.key}-host`, record.host)}
                    />
                    <CopyChip
                      label="Destino / Valor"
                      value={record.value}
                      copied={copiedKey === `${record.key}-value`}
                      onCopy={() => copyValue(`${record.key}-value`, record.value)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* Paso 3 */}
        {savedDomain && !savedVerified ? (
          <section className="domain-guide-card">
            <div className="domain-guide-card-head">
              <span className="domain-guide-badge">Paso 3</span>
              <h3 className="domain-guide-card-title">Comprueba que ya quedó conectado</h3>
            </div>
            <p className="domain-guide-card-text">
              Cuando hayas pegado los datos en tu proveedor, pulsa el botón. Si
              aún no está listo, te diremos qué falta con palabras simples.
            </p>

            <div className="mt-4 space-y-3">
              <Button
                type="button"
                onClick={() => {
                  void handleVerifyConnection();
                }}
                disabled={pending || verifying}
                aria-busy={verifying}
                className="min-w-[12rem]"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Consultando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Comprobar si ya está listo
                  </>
                )}
              </Button>

              {verifying ? (
                <div
                  className="domain-guide-verify-live"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="domain-guide-verify-live-dot" aria-hidden="true" />
                  <p className="domain-guide-verify-live-text">{verifyStatusMessage}</p>
                </div>
              ) : null}
            </div>

            {!verifying ? (
              <CustomDomainVerificationPanel
                verification={verification}
                verifying={false}
              />
            ) : null}
          </section>
        ) : null}

        {savedVerified ? (
          <div className="domain-guide-callout domain-guide-callout-success">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">Tu marca ya luce en la URL</p>
              <p className="mt-1 text-xs opacity-90">
                Comparte {savedDomain} con tus clientes. Si algo deja de funcionar,
                puedes quitar el dominio y volver a conectarlo.
              </p>
            </div>
          </div>
        ) : null}

        {!savedDomain ? (
          <div className="domain-guide-help">
            <Headphones
              className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                ¿Aún no tienes dominio?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Puedes comprarlo en minutos y luego volver aquí a conectarlo con
                la misma guía.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://www.cloudflare.com/es-es/products/registrar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Comprar dominio
                </a>
                {managedDomainMailto ? (
                  <a
                    href={managedDomainMailto}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Pedir ayuda a soporte
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("alcentimo:open-support"),
                      );
                    }}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Pedir ayuda a soporte
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="domain-guide-help">
            <Headphones
              className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                ¿Te trabaste en algún paso?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Escríbenos y te ayudamos a conectarlo. También puedes pedirnos
                que lo configuremos por ti.
              </p>
              <div className="mt-3">
                {managedDomainMailto ? (
                  <a
                    href={managedDomainMailto}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Contactar soporte
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("alcentimo:open-support"),
                      );
                    }}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Contactar soporte
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="text-xs text-emerald-700 dark:text-emerald-300"
            role="status"
          >
            {success}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}
