"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { buildCustomerWhatsAppUrl } from "@/lib/orders/customer-whatsapp";
import { cn } from "@/lib/cn";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 6.045L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export interface DashboardWhatsAppWidgetProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  phone: string | null;
  message: string;
  onMessageChange: (value: string) => void;
  /** Contenido opcional encima del hilo (p. ej. selector de objetivos IA). */
  toolbar?: ReactNode;
  hint?: string;
  loading?: boolean;
  error?: string | null;
  primaryLabel?: string;
  className?: string;
}

/**
 * Widget flotante de WhatsApp para el dashboard (estilo catálogo).
 * No abre wa.me hasta que el usuario pulse «Abrir chat».
 */
export function DashboardWhatsAppWidget({
  open,
  onClose,
  contactName,
  phone,
  message,
  onMessageChange,
  toolbar = null,
  hint = "Revisa o edita el mensaje. WhatsApp solo se abre cuando pulses Continuar.",
  loading = false,
  error = null,
  primaryLabel = "Abrir chat",
  className,
}: DashboardWhatsAppWidgetProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const displayName = contactName.trim() || "cliente";
  const whatsappUrl = buildCustomerWhatsAppUrl(phone, undefined, message);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 140);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleOpenChat() {
    if (!whatsappUrl || loading || !message.trim()) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <div
      className={cn("dashboard-wa-overlay", className)}
      role="presentation"
    >
      <button
        type="button"
        className="dashboard-wa-backdrop"
        aria-label="Cerrar vista previa de WhatsApp"
        onClick={onClose}
      />

      <div
        className="dashboard-wa-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="catalog-wa-header">
          <div className="catalog-wa-header-main">
            <span className="catalog-wa-header-icon" aria-hidden="true">
              <WhatsAppGlyph className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="catalog-wa-title">
                {displayName}
              </h2>
              <p className="catalog-wa-status">Vista previa · WhatsApp</p>
            </div>
          </div>
          <button
            type="button"
            className="catalog-wa-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {toolbar ? <div className="dashboard-wa-toolbar">{toolbar}</div> : null}

        <div className="catalog-wa-messages">
          <div className="catalog-wa-bubble catalog-wa-bubble-store whitespace-pre-wrap">
            {loading && !message.trim() ? (
              <span className="inline-flex items-center gap-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Generando mensaje…
              </span>
            ) : (
              message.trim() || "El mensaje aparecerá aquí."
            )}
          </div>
          <p className="catalog-wa-hint">{hint}</p>
          {error ? (
            <p className="text-xs text-amber-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="dashboard-wa-composer">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            rows={3}
            disabled={loading}
            placeholder="Escribe o edita el mensaje…"
            className="catalog-wa-input min-h-[4.5rem] max-h-36"
            aria-label="Mensaje para WhatsApp"
          />
          <button
            type="button"
            className={cn(
              "dashboard-wa-open-btn",
              (!whatsappUrl || loading || !message.trim()) &&
                "pointer-events-none opacity-45",
            )}
            disabled={!whatsappUrl || loading || !message.trim()}
            onClick={handleOpenChat}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            )}
            {primaryLabel}
          </button>
        </div>

        {!whatsappUrl ? (
          <p className="dashboard-wa-no-phone">
            No hay un teléfono válido para abrir WhatsApp.
          </p>
        ) : null}
      </div>
    </div>
  );
}
