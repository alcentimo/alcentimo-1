"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Globe, Loader2 } from "lucide-react";
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
  getCustomDomainCnameTarget,
  getCustomDomainDnsHostLabel,
  isApexCustomDomain,
} from "@/lib/domains/custom-domain";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { cn } from "@/lib/cn";

interface CustomDomainSectionProps {
  storeSlug: string;
  customDomain: string | null;
  customDomainVerified: boolean;
}

export function CustomDomainSection({
  storeSlug,
  customDomain,
  customDomainVerified,
}: CustomDomainSectionProps) {
  const [domainInput, setDomainInput] = useState(customDomain ?? "");
  const [savedDomain, setSavedDomain] = useState(customDomain);
  const [savedVerified, setSavedVerified] = useState(customDomainVerified);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cnameTarget = getCustomDomainCnameTarget();
  const dnsHost = savedDomain ? getCustomDomainDnsHostLabel(savedDomain) : "www";
  const publicUrl = savedDomain && savedVerified
    ? getStoreCatalogPublicUrl(storeSlug, "/", {
        customDomain: savedDomain,
        customDomainVerified: true,
      })
    : null;

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
          ? "Dominio guardado. Configura el CNAME y espera la verificación."
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
      description="Usa tu propio dominio (ej. tienda.tudominio.com) para que tus clientes vean tu marca."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="custom-domain-input" className="payment-field-label">
            Tu dominio
          </Label>
          <Input
            id="custom-domain-input"
            type="text"
            placeholder="tienda.tudominio.com"
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            className="payment-field-input mt-1.5"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Recomendamos un subdominio como <strong>tienda</strong> o{" "}
            <strong>www</strong>. El dominio raíz (@) requiere ayuda del equipo.
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
                    ? "Dominio activo y verificado."
                    : "Pendiente de verificación. Configura el DNS y avisa a soporte si necesitas activación manual."}
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
            Instrucciones DNS (CNAME)
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-zinc-600 dark:text-zinc-300">
            <li>Entra al panel DNS de tu proveedor (GoDaddy, Cloudflare, etc.).</li>
            <li>Crea un registro <strong>CNAME</strong>.</li>
            <li>
              En <strong>Host / Nombre</strong>, usa{" "}
              <code className="rounded bg-white px-1 py-0.5 dark:bg-zinc-950">{dnsHost}</code>.
            </li>
            <li>
              En <strong>Valor / Destino</strong>, apunta a{" "}
              <code className="rounded bg-white px-1 py-0.5 dark:bg-zinc-950">{cnameTarget}</code>.
            </li>
            <li>Guarda los cambios. La propagación puede tardar hasta 24 horas.</li>
          </ol>

          {savedDomain && isApexCustomDomain(savedDomain) ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              Este dominio parece ser raíz (@). Si tu proveedor no permite CNAME en la raíz,
              contáctanos para configurarlo manualmente.
            </p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => copyValue("host", dnsHost)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {copiedKey === "host" ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Copiar host: {dnsHost}
            </button>
            <button
              type="button"
              onClick={() => copyValue("target", cnameTarget)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {copiedKey === "target" ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Copiar destino CNAME
            </button>
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
