"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import { formatUsd } from "@/lib/format";
import type { LandingInstantStoreResult } from "@/lib/ai/landing-instant-store-types";

interface HeroInstantStorePreviewProps {
  preview: LandingInstantStoreResult;
  signupHref: string;
}

export function HeroInstantStorePreview({
  preview,
  signupHref,
}: HeroInstantStorePreviewProps) {
  return (
    <div className="landing-instant-preview">
      <div className="landing-instant-preview-glow" aria-hidden="true" />
      <div className="landing-instant-preview-card">
        <div className="landing-instant-preview-header">
          <span className="landing-instant-preview-icon" aria-hidden="true">
            <Store className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="landing-instant-preview-eyebrow">Vista previa generada</p>
            <h3 className="landing-instant-preview-store">{preview.storeName}</h3>
            <p className="landing-instant-preview-rubro">{preview.rubroLabel}</p>
          </div>
          <span className="landing-instant-preview-ai-badge">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            IA
          </span>
        </div>

        <p className="landing-instant-preview-intro">{preview.intro}</p>

        <ul className="landing-instant-preview-products">
          {preview.products.map((product) => (
            <li key={product.nombre} className="landing-instant-preview-product">
              <div className="landing-instant-preview-product-main">
                <p className="landing-instant-preview-product-name">{product.nombre}</p>
                <p className="landing-instant-preview-product-desc">{product.descripcion}</p>
              </div>
              <div className="landing-instant-preview-product-meta">
                <span className="landing-instant-preview-product-price">
                  {formatUsd(product.precio)}
                </span>
                <span className="landing-instant-preview-product-stock">
                  Stock {product.stock}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <Link href={signupHref} prefetch={true} className="landing-instant-preview-cta">
          Comenzar gratis con esta tienda
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <p className="landing-instant-preview-footnote">
          Tu borrador se guarda al registrarte. Podrás editar nombre, productos y diseño en minutos.
        </p>
      </div>
    </div>
  );
}
