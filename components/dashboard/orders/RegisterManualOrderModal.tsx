"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { formatUsd } from "@/lib/format";
import { createManualExternalOrder } from "@/lib/orders/create-manual-order";
import type { CatalogOrder } from "@/lib/orders/types";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_BY_KEY,
} from "@/src/config/payment-methods";
import { SHIPPING_METHODS } from "@/src/config/shipping-methods";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DraftLine = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceUsd: number;
  availableStock: number;
};

interface RegisterManualOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: CatalogListItem[];
  onCreated: (order: CatalogOrder) => void;
}

function variantStock(product: CatalogListItem, variantId: string): number {
  const variant = product.product_variants?.find((item) => item.id === variantId);
  if (variant && Number.isFinite(variant.stock)) return Math.max(0, variant.stock);
  return Math.max(0, product.available_stock);
}

function variantName(product: CatalogListItem, variantId: string): string {
  return (
    product.product_variants?.find((item) => item.id === variantId)?.name ??
    "Estándar"
  );
}

function isPaymentMethodKey(value: string): value is PaymentMethodKey {
  return Object.prototype.hasOwnProperty.call(PAYMENT_METHOD_BY_KEY, value);
}

function unitPrice(product: CatalogListItem, variantId: string): number {
  const extra =
    product.product_variants?.find((item) => item.id === variantId)?.price_extra_usd ??
    0;
  return Math.max(0, (product.price_usd ?? 0) + extra);
}

export function RegisterManualOrderModal({
  open,
  onOpenChange,
  products,
  onCreated,
}: RegisterManualOrderModalProps) {
  const sellable = useMemo(
    () => products.filter((product) => product.product_id && product.default_variant_id),
    [products],
  );

  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>(
    PAYMENT_METHODS[0]?.key ?? "pagoMovil",
  );
  const [shippingMethod, setShippingMethod] = useState("mrw");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedProduct =
    sellable.find((product) => product.product_id === selectedProductId) ?? null;
  const variants = selectedProduct?.product_variants ?? [];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sellable.slice(0, 40);
    return sellable
      .filter(
        (product) =>
          product.product_name.toLowerCase().includes(query) ||
          product.category_name.toLowerCase().includes(query) ||
          product.default_sku.toLowerCase().includes(query),
      )
      .slice(0, 40);
  }, [search, sellable]);

  const totalUsd = lines.reduce(
    (sum, line) => sum + line.unitPriceUsd * line.quantity,
    0,
  );

  function resetForm() {
    setSearch("");
    setSelectedProductId("");
    setSelectedVariantId("");
    setQuantity("1");
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setPaymentMethod(PAYMENT_METHODS[0]?.key ?? "pagoMovil");
    setShippingMethod("mrw");
    setError(null);
  }

  function handleClose() {
    if (pending) return;
    onOpenChange(false);
    resetForm();
  }

  function handleSelectProduct(productId: string) {
    setSelectedProductId(productId);
    const product = sellable.find((item) => item.product_id === productId);
    setSelectedVariantId(product?.default_variant_id ?? "");
  }

  function addLine() {
    if (!selectedProduct) {
      setError("Selecciona un producto de tu catálogo.");
      return;
    }
    const variantId = selectedVariantId || selectedProduct.default_variant_id;
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser mayor a cero.");
      return;
    }
    const stock = variantStock(selectedProduct, variantId);
    if (qty > stock) {
      setError(`Solo hay ${stock} unidad(es) disponibles de ese producto.`);
      return;
    }

    setError(null);
    setLines((current) => {
      const existing = current.find(
        (line) =>
          line.productId === selectedProduct.product_id &&
          line.variantId === variantId,
      );
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > stock) {
          setError(`Solo hay ${stock} unidad(es) disponibles de ese producto.`);
          return current;
        }
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: nextQty } : line,
        );
      }
      return [
        ...current,
        {
          key: `${selectedProduct.product_id}:${variantId}`,
          productId: selectedProduct.product_id,
          variantId,
          productName: selectedProduct.product_name,
          variantName: variantName(selectedProduct, variantId),
          quantity: qty,
          unitPriceUsd: unitPrice(selectedProduct, variantId),
          availableStock: stock,
        },
      ];
    });
    setQuantity("1");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await createManualExternalOrder({
        lines: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          variantName: line.variantName,
          quantity: line.quantity,
          unitPriceUsd: line.unitPriceUsd,
        })),
        customerName,
        customerPhone,
        deliveryAddress,
        paymentMethod,
        shippingMethod,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.order);
      onOpenChange(false);
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar la orden.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}
      containerClassName="max-w-xl"
    >
      <DialogContent
        onClose={handleClose}
        className="relative max-h-[90vh] overflow-y-auto p-5 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle>Registrar venta manual</DialogTitle>
          <DialogDescription>
            Crea una orden externa (WhatsApp, Instagram u otro canal) con productos de
            tu catálogo para que Alcéntimo procese el envío.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <p className="alert-error" role="alert">
              {error}
            </p>
          ) : null}

          <section className="space-y-3">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Productos del catálogo
            </p>
            {sellable.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay productos habilitados. Publica SKU de Megabodega en tu catálogo
                para registrar ventas.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="manual-order-search">Buscar producto</Label>
                    <Input
                      id="manual-order-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Nombre, categoría o SKU"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="manual-order-product">Producto</Label>
                    <select
                      id="manual-order-product"
                      value={selectedProductId}
                      onChange={(event) => handleSelectProduct(event.target.value)}
                      className="input-field mt-1.5"
                    >
                      <option value="">Selecciona un producto…</option>
                      {filteredProducts.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.product_name} · stk {product.available_stock} ·{" "}
                          {formatUsd(product.price_usd)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {variants.length > 1 ? (
                    <div>
                      <Label htmlFor="manual-order-variant">Variante</Label>
                      <select
                        id="manual-order-variant"
                        value={selectedVariantId}
                        onChange={(event) => setSelectedVariantId(event.target.value)}
                        className="input-field mt-1.5"
                      >
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.name} · stk {variant.stock}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <Label htmlFor="manual-order-qty">Cantidad</Label>
                    <Input
                      id="manual-order-qty"
                      type="number"
                      min={1}
                      step={1}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Agregar al pedido
                </Button>
              </>
            )}

            {lines.length > 0 ? (
              <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {line.quantity}× {line.productName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {line.variantName} · {formatUsd(line.unitPriceUsd * line.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.key !== line.key),
                        )
                      }
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900"
                      aria-label={`Quitar ${line.productName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 sm:col-span-2">
              Datos del cliente y envío
            </p>
            <div>
              <Label htmlFor="manual-order-name">Nombre</Label>
              <Input
                id="manual-order-name"
                required
                minLength={2}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="mt-1.5"
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label htmlFor="manual-order-phone">Teléfono</Label>
              <Input
                id="manual-order-phone"
                required
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="mt-1.5"
                placeholder="0412-1234567"
              />
            </div>
            <div>
              <Label htmlFor="manual-order-shipping">Courier / envío</Label>
              <select
                id="manual-order-shipping"
                value={shippingMethod}
                onChange={(event) => setShippingMethod(event.target.value)}
                className="input-field mt-1.5"
              >
                {SHIPPING_METHODS.map((method) => (
                  <option key={method.key} value={method.key}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="manual-order-payment">Método de pago</Label>
              <select
                id="manual-order-payment"
                value={paymentMethod}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isPaymentMethodKey(next)) {
                    setPaymentMethod(next);
                  }
                }}
                className="input-field mt-1.5"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.key} value={method.key}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            {shippingMethod !== "pickup" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="manual-order-address">Dirección de envío</Label>
                <textarea
                  id="manual-order-address"
                  required
                  minLength={8}
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  className="input-field mt-1.5 min-h-20"
                  placeholder="Ciudad, agencia MRW o dirección completa"
                />
              </div>
            ) : null}
          </section>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Total {formatUsd(totalUsd)}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-brand min-h-9 px-4" disabled={pending || lines.length === 0}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando…
                  </>
                ) : (
                  "Guardar orden"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
