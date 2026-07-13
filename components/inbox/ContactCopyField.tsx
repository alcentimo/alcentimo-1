"use client";

import { useState } from "react";
import { Check, Copy, Mail, Phone } from "lucide-react";

interface ContactCopyFieldProps {
  kind: "phone" | "email";
  label: string;
  value: string | null;
}

export function ContactCopyField({ kind, label, value }: ContactCopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const Icon = kind === "phone" ? Phone : Mail;
  const displayValue = value?.trim() || "Sin dato";
  const canCopy = Boolean(value?.trim());

  async function handleCopy() {
    if (!canCopy || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!canCopy}
      className="inbox-contact-copy-row"
      aria-label={canCopy ? `Copiar ${label}` : `${label} no disponible`}
    >
      <span className="inbox-contact-copy-icon" aria-hidden="true">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="inbox-contact-copy-label">{label}</span>
        <span className="inbox-contact-copy-value">{displayValue}</span>
      </span>
      <span className="inbox-contact-copy-action" aria-hidden="true">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
