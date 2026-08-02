"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { CustomDomainDnsVerificationResult } from "@/lib/domains/verify-custom-domain-dns";
import { cn } from "@/lib/cn";

interface CustomDomainVerificationPanelProps {
  verification: CustomDomainDnsVerificationResult | null;
  verifying: boolean;
}

function renderSuggestionText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index}>{part}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function friendlyCheckLabel(host: string, recordType: string): string {
  if (recordType === "A") {
    return "Dominio raíz (@) · registro A";
  }
  if (host.startsWith("www.")) {
    return "Versión con www · CNAME";
  }
  return "Subdominio · CNAME";
}

export function CustomDomainVerificationPanel({
  verification,
  verifying,
}: CustomDomainVerificationPanelProps) {
  if (verifying || !verification) return null;

  const toneClass =
    verification.status === "success"
      ? "domain-dns-verify-success"
      : verification.status === "pending"
        ? "domain-dns-verify-pending"
        : "domain-dns-verify-error";

  const Icon =
    verification.status === "success" ? CheckCircle2 : AlertCircle;

  const headline =
    verification.status === "success"
      ? "¡Conexión correcta!"
      : verification.status === "pending"
        ? "Aún no lo vemos listo"
        : "Hay que ajustar algo";

  const summary =
    verification.status === "success"
      ? "Tu dominio ya apunta bien. Activamos el candado de seguridad (HTTPS) automáticamente."
      : verification.summary;

  return (
    <div
      className={cn("domain-dns-verify mt-4", toneClass)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{headline}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{summary}</p>

          {verification.checks.length > 0 ? (
            <ul className="domain-dns-check-list mt-3 space-y-2">
              {verification.checks.map((check) => (
                <li
                  key={`${check.host}-${check.recordType}`}
                  className={cn(
                    "domain-dns-check-item",
                    check.ok ? "domain-dns-check-ok" : "domain-dns-check-fail",
                  )}
                >
                  <p className="font-medium">
                    {friendlyCheckLabel(check.host, check.recordType)}
                    {check.ok ? " · bien" : " · pendiente"}
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Debe apuntar a: <code>{check.expected}</code>
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Ahora vemos:{" "}
                    <code>{check.actual ?? "todavía no configurado"}</code>
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {verification.suggestions.length > 0 &&
          verification.status !== "success" ? (
            <div className="mt-3 rounded-lg border border-current/15 bg-black/5 px-3 py-2.5 dark:bg-white/5">
              <p className="text-xs font-semibold opacity-90">
                Tips para terminar
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
                {verification.suggestions.slice(0, 3).map((suggestion) => (
                  <li key={suggestion} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{renderSuggestionText(suggestion)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
