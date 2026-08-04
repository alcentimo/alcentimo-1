import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  formatApproxBs,
  formatExchangeRate,
  formatUsd,
} from "@/lib/format";

interface LandingFashionCatalogMockupProps {
  className?: string;
  exchangeRate?: number | null;
}

const PRODUCTS = [
  {
    name: "Vestido midi",
    detail: "Talla M · Algodón",
    priceUsd: 42,
    image: null as string | null,
    tone: "from-[#ebe4dc] to-[#d4c4b0]",
  },
  {
    name: "Jeans Slim Fit",
    detail: "Talla 32 · Denim",
    priceUsd: 35,
    image: "/images/referencia/ropa-moda/jean-indigo.webp",
    tone: "from-zinc-200 to-zinc-300",
  },
  {
    name: "Camisa básica",
    detail: "Talla L · Pima",
    priceUsd: 22,
    image: "/images/referencia/ropa-moda/camiseta-pima.webp",
    tone: "from-stone-100 to-stone-200",
  },
  {
    name: "Blazer Milano",
    detail: "Talla S · Lana",
    priceUsd: 78,
    image: "/images/referencia/ropa-moda/blazer-milano.webp",
    tone: "from-neutral-200 to-neutral-300",
  },
] as const;

export function LandingFashionCatalogMockup({
  className,
  exchangeRate = null,
}: LandingFashionCatalogMockupProps) {
  const rateLabel =
    exchangeRate != null
      ? `Bs. ${formatExchangeRate(exchangeRate)}`
      : "Bs. —";

  return (
    <div
      className={cn("landing-fashion-mockup", className)}
      aria-hidden="true"
    >
      <div className="landing-fashion-mockup-frame">
        <div className="landing-fashion-mockup-chrome">
          <span className="landing-dashboard-mockup-dot bg-red-400/90" />
          <span className="landing-dashboard-mockup-dot bg-amber-400/90" />
          <span className="landing-dashboard-mockup-dot bg-emerald-400/90" />
          <span className="landing-fashion-mockup-url">
            boutique-luna.alcentimo.com
          </span>
        </div>

        <div className="landing-fashion-mockup-body">
          <header className="landing-fashion-mockup-header">
            <div className="landing-fashion-mockup-brand">
              <div className="landing-fashion-mockup-logo">BL</div>
              <div className="min-w-0">
                <p className="landing-fashion-mockup-store-name">Boutique Luna</p>
                <p className="landing-fashion-mockup-store-tag">
                  Moda contemporánea
                </p>
              </div>
            </div>
            <div className="landing-fashion-mockup-rate">
              <span className="landing-fashion-mockup-rate-label">Tasa BCV</span>
              <span className="landing-fashion-mockup-rate-value">{rateLabel}</span>
            </div>
          </header>

          <div className="landing-fashion-mockup-meta">
            <span>4 productos</span>
            <span>Catálogo activo</span>
          </div>

          <div className="landing-fashion-mockup-grid">
            {PRODUCTS.map((product) => {
              const bsLabel =
                exchangeRate != null
                  ? formatApproxBs(product.priceUsd * exchangeRate)
                  : null;

              return (
                <article
                  key={product.name}
                  className="landing-fashion-mockup-product"
                >
                  <div
                    className={cn(
                      "landing-fashion-mockup-product-media",
                      `bg-gradient-to-br ${product.tone}`,
                    )}
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover"
                        quality={75}
                      />
                    ) : null}
                  </div>
                  <div className="landing-fashion-mockup-product-body">
                    <p className="landing-fashion-mockup-product-name">
                      {product.name}
                    </p>
                    <p className="landing-fashion-mockup-product-detail">
                      {product.detail}
                    </p>
                    <p className="landing-fashion-mockup-product-price">
                      {formatUsd(product.priceUsd)}
                    </p>
                    {bsLabel ? (
                      <p className="landing-fashion-mockup-product-bs">{bsLabel}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
