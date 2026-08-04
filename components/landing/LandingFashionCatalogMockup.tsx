import Image from "next/image";
import { MessageCircle, ShoppingBag, X } from "lucide-react";
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
    priceUsd: 42,
    image: null as string | null,
    tone: "from-[#ebe4dc] to-[#d4c4b0]",
  },
  {
    name: "Jeans Slim Fit",
    priceUsd: 35,
    image: "/images/referencia/ropa-moda/jean-indigo.webp",
    tone: "from-zinc-200 to-zinc-300",
  },
  {
    name: "Camisa básica",
    priceUsd: 22,
    image: "/images/referencia/ropa-moda/camiseta-pima.webp",
    tone: "from-stone-100 to-stone-200",
  },
  {
    name: "Blazer Milano",
    priceUsd: 78,
    image: "/images/referencia/ropa-moda/blazer-milano.webp",
    tone: "from-neutral-200 to-neutral-300",
  },
] as const;

const CART_LINES = [
  { name: "Jeans Slim Fit", qty: 1, priceUsd: 35 },
  { name: "Camisa básica", qty: 1, priceUsd: 22 },
] as const;

const CART_SUBTOTAL_USD = CART_LINES.reduce(
  (sum, line) => sum + line.priceUsd * line.qty,
  0,
);

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

export function LandingFashionCatalogMockup({
  className,
  exchangeRate = null,
}: LandingFashionCatalogMockupProps) {
  const rateLabel =
    exchangeRate != null
      ? `Bs. ${formatExchangeRate(exchangeRate)}`
      : "Bs. —";

  const cartSubtotalBs =
    exchangeRate != null
      ? formatApproxBs(CART_SUBTOTAL_USD * exchangeRate)
      : null;

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

        <div className="landing-fashion-mockup-stage">
          <div className="landing-fashion-mockup-body">
            <header className="landing-fashion-mockup-header">
              <div className="landing-fashion-mockup-brand">
                <div className="landing-fashion-mockup-logo">BL</div>
                <div className="min-w-0">
                  <p className="landing-fashion-mockup-store-name">
                    Boutique Luna
                  </p>
                  <p className="landing-fashion-mockup-store-tag">
                    Moda contemporánea
                  </p>
                </div>
              </div>
              <div className="landing-fashion-mockup-rate">
                <span className="landing-fashion-mockup-rate-label">Tasa BCV</span>
                <span className="landing-fashion-mockup-rate-value">
                  {rateLabel}
                </span>
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
                          sizes="120px"
                          className="object-cover"
                          quality={75}
                        />
                      ) : null}
                    </div>
                    <div className="landing-fashion-mockup-product-body">
                      <p className="landing-fashion-mockup-product-name">
                        {product.name}
                      </p>
                      <p className="landing-fashion-mockup-product-price">
                        {formatUsd(product.priceUsd)}
                      </p>
                      {bsLabel ? (
                        <p className="landing-fashion-mockup-product-bs">
                          {bsLabel}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="landing-fashion-mockup-cart-sheet">
            <div className="landing-fashion-mockup-cart-head">
              <div>
                <p className="landing-fashion-mockup-cart-title">Tu carrito</p>
                <p className="landing-fashion-mockup-cart-store">Boutique Luna</p>
              </div>
              <span className="landing-fashion-mockup-cart-close">
                <X className="h-3.5 w-3.5" />
              </span>
            </div>

            <ul className="landing-fashion-mockup-cart-lines">
              {CART_LINES.map((line) => (
                <li key={line.name}>
                  <span>
                    {line.qty}× {line.name}
                  </span>
                  <strong>{formatUsd(line.priceUsd)}</strong>
                </li>
              ))}
            </ul>

            <div className="landing-fashion-mockup-cart-total">
              <span>Subtotal</span>
              <div className="text-right">
                <strong>{formatUsd(CART_SUBTOTAL_USD)}</strong>
                {cartSubtotalBs ? <p>{cartSubtotalBs}</p> : null}
              </div>
            </div>

            <div className="landing-fashion-mockup-cart-actions">
              <span className="landing-fashion-mockup-cart-checkout">
                Finalizar pedido
              </span>
              <span className="landing-fashion-mockup-cart-whatsapp">
                <MessageCircle className="h-3.5 w-3.5" />
                Enviar pedido por WhatsApp
              </span>
            </div>
          </div>

          <div className="landing-fashion-mockup-fabs">
            <span className="landing-fashion-mockup-wa-fab">
              <WhatsAppGlyph className="h-4 w-4" />
            </span>
            <span className="landing-fashion-mockup-cart-fab">
              <ShoppingBag className="h-4 w-4" />
              <span className="landing-fashion-mockup-cart-fab-badge">2</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
