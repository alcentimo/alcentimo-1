"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useMercadoCart } from "@/components/mercado-oculto/MercadoCartProvider";
import {
  buildMercadoLoginHref,
  MORICHE_BRAND_LABEL,
} from "@/lib/mercado-oculto/access";
import { formatUsd } from "@/lib/format";

interface MercadoCartViewProps {
  isAuthenticated: boolean;
}

export function MercadoCartView({ isAuthenticated }: MercadoCartViewProps) {
  const router = useRouter();
  const { items, ready, itemCount, subtotalUsd, setQuantity, removeItem, clear } =
    useMercadoCart();

  if (!ready) {
    return <p className="text-sm text-zinc-500">Cargando carrito…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mercado-ml-cart-empty">
        <ShoppingBag className="h-10 w-10 text-emerald-700/70" aria-hidden="true" />
        <h1>Tu carrito está vacío</h1>
        <p>
          Explorá la vitrina Moriche y agregá piezas con compra protegida. Podés
          armar el carrito sin cuenta.
        </p>
        <Link href="/mercado-oculto" className="mercado-ml-btn-primary">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  function handleCheckout() {
    if (!isAuthenticated) {
      router.push(buildMercadoLoginHref("/mercado-oculto/conversaciones"));
      return;
    }
    router.push("/mercado-oculto/conversaciones");
  }

  return (
    <div className="mercado-ml-cart">
      <div className="mercado-ml-cart-main">
        <div className="mercado-ml-cart-head">
          <h1>
            Carrito <span>({itemCount})</span>
          </h1>
          <button type="button" className="mercado-ml-link-btn" onClick={clear}>
            Vaciar carrito
          </button>
        </div>

        <p className="mercado-ml-cart-suppliers-meta">
          Vendido por {MORICHE_BRAND_LABEL} · un solo pedido centralizado
        </p>

        <div className="mercado-ml-cart-groups">
          <section
            className="mercado-ml-cart-group"
            aria-label={`Productos de ${MORICHE_BRAND_LABEL}`}
          >
            <header className="mercado-ml-cart-group-head">
              <div>
                <p className="mercado-ml-cart-group-kicker">Vendedor</p>
                <h2>{MORICHE_BRAND_LABEL}</h2>
              </div>
              <p>
                {itemCount} art. · {formatUsd(subtotalUsd)}
              </p>
            </header>

            <ul className="mercado-ml-cart-list">
              {items.map((item) => (
                <li key={item.productId} className="mercado-ml-cart-row">
                  <Link
                    href={`/mercado-oculto/producto/${item.productId}`}
                    className="mercado-ml-cart-thumb"
                  >
                    {item.thumbUrl ? (
                      <Image
                        src={item.thumbUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="88px"
                        unoptimized
                      />
                    ) : (
                      <span aria-hidden="true">
                        {item.productName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  <div className="mercado-ml-cart-info">
                    <Link href={`/mercado-oculto/producto/${item.productId}`}>
                      {item.productName}
                    </Link>
                    <p>por {MORICHE_BRAND_LABEL}</p>
                    <div className="mercado-ml-cart-actions">
                      <label>
                        Cantidad
                        <input
                          type="number"
                          min={1}
                          max={item.availableStock || undefined}
                          value={item.quantity}
                          onChange={(event) =>
                            setQuantity(
                              item.productId,
                              Number(event.target.value) || 1,
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Quitar ${item.productName}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <p className="mercado-ml-cart-line-price">
                    {formatUsd(item.priceUsd * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <aside className="mercado-ml-cart-summary">
        <h2>Resumen de compra</h2>
        <div className="mercado-ml-cart-summary-row">
          <span>Productos ({itemCount})</span>
          <strong>{formatUsd(subtotalUsd)}</strong>
        </div>
        <p className="mercado-ml-cart-summary-note">
          Todo se compra bajo la marca {MORICHE_BRAND_LABEL}. Para finalizar el
          pedido necesitás una cuenta Alcéntimo.
        </p>
        <button
          type="button"
          className="mercado-ml-btn-primary"
          onClick={handleCheckout}
        >
          {isAuthenticated ? "Finalizar pedido" : "Iniciar sesión para comprar"}
        </button>
        <Link href="/mercado-oculto" className="mercado-ml-btn-ghost">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
