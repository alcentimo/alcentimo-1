"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroCompositeMockup } from "@/components/landing/HeroCompositeMockup";
import { HeroInstantStorePreview } from "@/components/landing/HeroInstantStorePreview";
import type { LandingInstantStoreResult } from "@/lib/ai/landing-instant-store-types";
import {
  writeLandingInstantStoreDraft,
  type LandingInstantStoreDraft,
} from "@/lib/landing/preview-draft-storage";

import { MERCHANT_SIGNUP_HREF } from "@/lib/landing/merchant-signup-href";

export function HeroInstantStoreExperience() {
  const [businessHint, setBusinessHint] = useState("");
  const [preview, setPreview] = useState<LandingInstantStoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    const hint = businessHint.trim();
    if (hint.length < 3 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/landing/instant-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHint: hint }),
      });

      const payload = (await response.json()) as LandingInstantStoreResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo generar la vista previa.");
      }

      const draft: LandingInstantStoreDraft = {
        businessHint: hint,
        storeName: payload.storeName,
        rubro: payload.rubro,
        rubroLabel: payload.rubroLabel,
        intro: payload.intro,
        products: payload.products,
        createdAt: Date.now(),
      };

      writeLandingInstantStoreDraft(draft);
      setPreview(payload);
    } catch (generateError) {
      setPreview(null);
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Error al generar la vista previa.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void handleGenerate();
  }

  return (
    <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
      <div className="max-w-xl lg:max-w-none">
        <Badge variant="success" className="landing-hero-badge">
          🚀 El software todo en uno para digitalizar tu negocio
        </Badge>

        <h1 className="landing-hero-title text-balance">
          Tu gestor de ventas y e-commerce con{" "}
          <span className="landing-hero-accent">marca blanca</span>.
        </h1>

        <p className="landing-hero-lead">
          Controla tu inventario, sincroniza tasas de cambio en tiempo real y lanza tu
          catálogo online con tu propio dominio y logo. Recibe pedidos organizados
          directamente en WhatsApp, sin depender de intermediarios.
        </p>

        <form onSubmit={handleSubmit} className="landing-instant-builder mt-8">
          <label htmlFor="landing-business-hint" className="landing-instant-builder-label">
            Crea tu tienda con IA en segundos
          </label>
          <div className="landing-instant-builder-row">
            <input
              id="landing-business-hint"
              type="text"
              value={businessHint}
              onChange={(event) => setBusinessHint(event.target.value)}
              placeholder="Ej: Pastelería artesanal, Ferretería El Tornillo…"
              maxLength={120}
              disabled={loading}
              className="landing-instant-builder-input"
              aria-describedby="landing-business-hint-help"
            />
            <button
              type="submit"
              disabled={loading || businessHint.trim().length < 3}
              className="landing-instant-builder-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generando…
                </>
              ) : (
                <>
                  <WandSparkles className="h-4 w-4" aria-hidden="true" />
                  Generar tienda
                </>
              )}
            </button>
          </div>
          <p id="landing-business-hint-help" className="landing-instant-builder-help">
            <Sparkles className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{" "}
            Escribe tu rubro o nombre comercial y te mostramos un catálogo de ejemplo al
            instante.
          </p>
          {error ? (
            <p className="landing-instant-builder-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="mt-8">
          <Link
            href={MERCHANT_SIGNUP_HREF}
            prefetch={true}
            className="btn-brand inline-flex gap-2 px-7 py-3 text-base shadow-lg shadow-emerald-500/20 touch-manipulation"
          >
            Comenzar gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-500">
          Sin tarjeta de crédito · Configura tu tienda en minutos
        </p>
      </div>

      <div className="w-full lg:justify-self-end">
        {preview ? (
          <HeroInstantStorePreview preview={preview} signupHref={MERCHANT_SIGNUP_HREF} />
        ) : (
          <HeroCompositeMockup />
        )}
      </div>
    </div>
  );
}
