"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Store, Trash2 } from "lucide-react";
import { useMercadoCart } from "@/components/mercado-oculto/MercadoCartProvider";
import { formatUsd } from "@/lib/format";

export function MercadoCartView() {
  const {
    groups,
    ready,
    itemCount,
    subtotalUsd,
    supplierCount,
    setQuantity,
    removeItem,
    clear,
  } = useMercadoCart();

  if (!ready) {
    return <p className="text-sm text-zinc-500">Cargando carrito…</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="mercado-ml-cart-empty">
        <ShoppingBag className="h-10 w-10 text-[#125699]/70" aria-hidden="true" />
        <h1>Tu carrito está vacío</h1>
        <p>
          ¡Aprovechá el envío a nivel nacional! Explorá ofertas mayoristas y
          agregá productos con compra protegida.
        </p>
        <Link href="/mercado-oculto" className="mercado-ml-btn-primary">
          Ir al catálogo
        </Link>
      </div>
    );
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
          {supplierCount} proveedor{supplierCount === 1 ? "" : "es"} · las
          órdenes se separan por mayorista
        </p>

        <div className="mercado-ml-cart-groups">
          {groups.map((group) => (
            <section
              key={group.supplierUserId || group.supplierLabel}
              className="mercado-ml-cart-group"
              aria-label={`Productos de ${group.supplierLabel}`}
            >
              <header className="mercado-ml-cart-group-head">
                <div>
                  <p className="mercado-ml-cart-group-kicker">
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    Proveedor
                  </p>
                  <h2>{group.supplierLabel}</h2>
                </div>
                <p>
                  {group.itemCount} art. · {formatUsd(group.subtotalUsd)}
                </p>
              </header>

              <ul className="mercado-ml-cart-list">
                {group.items.map((item) => (
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
                      <p>por {item.supplierLabel}</p>
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
          ))}
        </div>
      </div>

      <aside className="mercado-ml-cart-summary">
        <h2>Resumen de compra</h2>
        <div className="mercado-ml-cart-summary-row">
          <span>Productos ({itemCount})</span>
          <strong>{formatUsd(subtotalUsd)}</strong>
        </div>
        <ul className="mercado-ml-cart-summary-suppliers">
          {groups.map((group) => (
            <li key={`sum-${group.supplierUserId || group.supplierLabel}`}>
              <span>{group.supplierLabel}</span>
              <strong>{formatUsd(group.subtotalUsd)}</strong>
            </li>
          ))}
        </ul>
        <p className="mercado-ml-cart-summary-note">
          Cada proveedor genera su propia negociación/orden. Coordiná pago y
          envío por mayorista desde chats o el detalle del producto.
        </p>
        <Link
          href="/mercado-oculto/conversaciones"
          className="mercado-ml-btn-primary"
        >
          Continuar / negociar
        </Link>
        <Link href="/mercado-oculto" className="mercado-ml-btn-ghost">
          Seguir comprando
        </Link>
      </aside>
    </div>
  );
}
