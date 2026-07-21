"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Globe, Headphones, Loader2 } from "lucide-react";
import {
  SettingsSection,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  clearStoreCustomDomainRequest,
  saveStoreCustomDomainRequest,
} from "@/lib/settings/custom-domain-actions";
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
}

interface DnsRecordRow {
  key: string;
  type: "CNAME" | "A";
  host: string;
  value: string;
  note?: string;
}

function DnsRecordsTable({
  records,
  copiedKey,
  onCopy,
}: {
  records: DnsRecordRow[];
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200/80 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Host / Nombre</th>
            <th className="px-3 py-2 font-medium">Valor / Destino</th>
            <th className="px-3 py-2 font-medium sr-only">Copiar</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.key}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
            >
              <td className="px-3 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">
                {record.type}
              </td>
              <td className="px-3 py-2.5">
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-900">
                  {record.host}
                </code>
              </td>
              <td className="px-3 py-2.5">
                <code className="break-all rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-900">
                  {record.value}
                </code>
                {record.note ? (
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {record.note}
                  </p>
                ) : null}
              </td>
              <td className="px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onCopy(record.key, record.value)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {copiedKey === record.key ? (
                    <Check className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  Copiar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomDomainSection({
  storeSlug,
  customDomain,
  customDomainVerified,
}: CustomDomainSectionProps) {
  const { supportEmail } = usePlatformSettings();
  const [domainInput, setDomainInput] = useState(customDomain ?? "");
  const [savedDomain, setSavedDomain] = useState(customDomain);
  const [savedVerified, setSavedVerified] = useState(customDomainVerified);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cnameTarget = getCustomDomainCnameTarget();
  const apexTarget = getCustomDomainApexATarget();
  const dnsHost = savedDomain ? getCustomDomainDnsHostLabel(savedDomain) : "www";
  const isApex = savedDomain ? isApexCustomDomain(savedDomain) : false;
  const publicUrl = savedDomain && savedVerified
    ? getStoreCatalogPublicUrl(storeSlug, "/", {
        customDomain: savedDomain,
        customDomainVerified: true,
      })
    : null;

  const managedDomainMailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("Dominio personalizado — gestión por Alcentimo")}&body=${encodeURIComponent("Hola, me gustaría que Alcentimo compre o configure mi dominio personalizado para mi tienda.\n\nDominio deseado: \nTienda: " + storeSlug)}`
    : null;

  const dnsRecords: DnsRecordRow[] = [
    {
      key: "cname",
      type: "CNAME",
      host: isApex ? "www" : dnsHost,
      value: cnameTarget,
      note: isApex
        ? "Recomendado: redirige www.tudominio.com hacia Alcentimo."
        : "Para subdominios como tienda.tudominio.com.",
    },
    ...(apexTarget
      ? [
          {
            key: "a",
            type: "A" as const,
            host: "@",
            value: apexTarget,
            note: "Solo si quieres usar el dominio raíz (tudominio.com).",
          },
        ]
      : []),
  ];

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

    startTransition(async () => {
      const result = await saveStoreCustomDomainRequest(domainInput);
      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedDomain(result.customDomain ?? null);
      setSavedVerified(Boolean(result.customDomainVerified));
      setDomainInput(result.customDomain ?? "");
      setSuccess(
        result.customDomain
          ? "Dominio guardado. Configura el DNS y espera la verificación del sistema."
          : "Dominio eliminado.",
      );
    });
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
      setSuccess("Dominio personalizado eliminado.");
    });
  }

  return (
    <SettingsSection
      title="Dominio personalizado"
      description="Usa tu propio dominio (ej. tutienda.com) para que tus clientes vean tu marca en la URL pública."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-domain-input" className="payment-field-label">
            Tu dominio
          </Label>
          <Input
            id="custom-domain-input"
            type="text"
            placeholder="tutienda.com o tienda.tudominio.com"
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            className="payment-field-input mt-1.5"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Puedes usar un subdominio (<strong>tienda</strong>, <strong>www</strong>) o
            el dominio raíz. Tras guardar, configura los registros DNS indicados abajo.
          </p>
        </div>

        {savedDomain ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              savedVerified
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
                : "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200",
            )}
          >
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium">{savedDomain}</p>
                <p className="mt-1 text-xs opacity-90">
                  {savedVerified
                    ? "Dominio activo y verificado. Tu catálogo responde en esta URL."
                    : "Pendiente de verificación. Tras configurar el DNS, el equipo validará la conexión (puede tardar hasta 24 h)."}
                </p>
                {publicUrl ? (
                  <p className="mt-2 break-all text-xs">{publicUrl}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Instrucciones DNS
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            En el panel DNS de tu proveedor (GoDaddy, Cloudflare, Namecheap, etc.),
            crea los registros que correspondan. La propagación puede tardar hasta 24 horas.
          </p>

          <DnsRecordsTable
            records={dnsRecords}
            copiedKey={copiedKey}
            onCopy={copyValue}
          />

          {isApex && !apexTarget ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              Para el dominio raíz (@), algunos proveedores no permiten CNAME.
              Escríbenos y te ayudamos a configurarlo manualmente.
            </p>
          ) : null}

          {!savedVerified && savedDomain ? (
            <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <strong>Verificación del sistema:</strong> cuando el DNS esté activo,
              nuestro equipo confirmará la conexión. No necesitas hacer nada más
              salvo avisarnos si pasan más de 24 h sin cambios.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex items-start gap-3">
            <Headphones
              className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                ¿Prefieres que Alcentimo lo configure por ti?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                Si no tienes un dominio o prefieres que compremos y conectemos el
                dominio por ti, nuestro equipo puede encargarse de la compra,
                configuración DNS y verificación.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {managedDomainMailto ? (
                  <a
                    href={managedDomainMailto}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Solicitar gestión del dominio
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("alcentimo:open-support"));
                    }}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Contactar soporte
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando…
              </>
            ) : (
              "Guardar dominio"
            )}
          </Button>
          {savedDomain ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={pending}
            >
              Quitar dominio
            </Button>
          ) : null}
        </div>
      </div>
    </SettingsSection>
  );
}
