"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, MousePointerClick, Package, Store, Zap } from "lucide-react";

const CATALOG_PRODUCTS = [
  { id: "p1", name: "Audífonos Pro", stock: 84, price: "$42" },
  { id: "p2", name: "Reloj Smart", stock: 51, price: "$68" },
  { id: "p3", name: "Mochila Urban", stock: 120, price: "$35" },
  { id: "p4", name: "Lámpara LED", stock: 67, price: "$24" },
] as const;

type FlowPhase = "idle" | "syncing" | "synced";

export function HeroDropshippingFlow() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const cycleRef = useRef<number | null>(null);
  const headingId = useId();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const prefersReduce = media.matches;
      setReduceMotion(prefersReduce);
      if (prefersReduce) {
        window.setTimeout(() => setPhase("synced"), 0);
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const runCycle = useCallback(() => {
    if (reduceMotion) {
      setPhase("synced");
      return;
    }

    setPhase("syncing");
    window.setTimeout(() => setPhase("synced"), 720);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const start = window.setTimeout(runCycle, 900);

    const loop = () => {
      setPhase("idle");
      window.setTimeout(runCycle, 700);
    };

    cycleRef.current = window.setInterval(loop, 5200);

    return () => {
      window.clearTimeout(start);
      if (cycleRef.current) window.clearInterval(cycleRef.current);
    };
  }, [reduceMotion, runCycle]);

  function handleSync() {
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    runCycle();
  }

  const synced = phase === "synced";
  const syncing = phase === "syncing";

  return (
    <div className="landing-hero-flow" aria-labelledby={headingId}>
      <p id={headingId} className="sr-only">
        Flujo de dropshipping: catálogo de proveedores sincronizado a tu tienda
        con un clic
      </p>

      <div className="landing-hero-flow-shell">
        <article className="landing-hero-flow-panel landing-hero-flow-panel-a">
          <header className="landing-hero-flow-panel-head">
            <span className="landing-hero-flow-kicker">
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              Lado A · Proveedores
            </span>
            <h3 className="landing-hero-flow-panel-title">Catálogo centralizado</h3>
            <p className="landing-hero-flow-panel-copy">
              Inventario real, listo para vender.
            </p>
          </header>

          <ul className="landing-hero-flow-products">
            {CATALOG_PRODUCTS.map((product, index) => (
              <li
                key={product.id}
                className={`landing-hero-flow-product${syncing ? " is-pulsing" : ""}`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="landing-hero-flow-swatch" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="landing-hero-flow-product-name">
                    {product.name}
                  </span>
                  <span className="landing-hero-flow-product-meta">
                    {product.stock} uds · {product.price}
                  </span>
                </span>
                <span className="landing-hero-flow-ready">Listo</span>
              </li>
            ))}
          </ul>
        </article>

        <div className="landing-hero-flow-bridge">
          <button
            type="button"
            className={`landing-hero-flow-sync${syncing ? " is-syncing" : ""}${synced ? " is-synced" : ""}`}
            onClick={handleSync}
            aria-pressed={synced}
          >
            {synced ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Zap className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{synced ? "Sincronizado" : "Un clic"}</span>
          </button>
          <span className="landing-hero-flow-bridge-hint">
            <MousePointerClick className="h-3 w-3" aria-hidden="true" />
            Sincroniza al instante
          </span>
        </div>

        <article className="landing-hero-flow-panel landing-hero-flow-panel-b">
          <header className="landing-hero-flow-panel-head">
            <span className="landing-hero-flow-kicker landing-hero-flow-kicker-store">
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
              Lado B · Tu tienda
            </span>
            <h3 className="landing-hero-flow-panel-title">Vitrina personalizada</h3>
            <p className="landing-hero-flow-panel-copy">
              Marca propia, catálogo sincronizado.
            </p>
          </header>

          <div className="landing-hero-flow-store">
            <div className="landing-hero-flow-store-bar">
              <span className="landing-hero-flow-store-name">tu-tienda.alcentimo</span>
              <span
                className={`landing-hero-flow-live${synced ? " is-on" : ""}`}
              >
                {synced ? "En vivo" : "Esperando"}
              </span>
            </div>

            <div
              className={`landing-hero-flow-store-grid${synced ? " is-synced" : ""}`}
            >
              {CATALOG_PRODUCTS.map((product, index) => (
                <div
                  key={product.id}
                  className="landing-hero-flow-store-card"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span className="landing-hero-flow-store-thumb" aria-hidden="true" />
                  <span className="landing-hero-flow-store-label">{product.name}</span>
                  <span className="landing-hero-flow-store-price">{product.price}</span>
                </div>
              ))}
            </div>

            {!synced ? (
              <p className="landing-hero-flow-empty">
                Sin inventario propio. El catálogo llega solo.
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
