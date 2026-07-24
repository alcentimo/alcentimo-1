"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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

export function CustomDomainVerificationPanel({
  verification,
  verifying,
}: CustomDomainVerificationPanelProps) {
  if (verifying) {
    return (
      <div
        className="domain-dns-verify domain-dns-verify-pending"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <p className="text-sm font-medium">Comprobando registros DNS…</p>
      </div>
    );
  }

  if (!verification) return null;

  const toneClass =
    verification.status === "success"
      ? "domain-dns-verify-success"
      : verification.status === "pending"
        ? "domain-dns-verify-pending"
        : "domain-dns-verify-error";

  const Icon =
    verification.status === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={cn("domain-dns-verify", toneClass)} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{verification.message}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{verification.summary}</p>

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
                    {check.host} · {check.recordType}
                    {check.ok ? " ✓" : " ✗"}
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Esperado: <code>{check.expected}</code>
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Detectado:{" "}
                    <code>{check.actual ?? "sin registro"}</code>
                  </p>
                  {check.note ? (
                    <p className="mt-1 text-[11px] opacity-80">{check.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {verification.suggestions.length > 0 ? (
            <div className="mt-3 rounded-lg border border-current/15 bg-black/5 px-3 py-2.5 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Qué corregir en tu proveedor
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed">
                {verification.suggestions.map((suggestion) => (
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
