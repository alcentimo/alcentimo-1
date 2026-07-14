"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { CatalogListItem } from "@/lib/database.types";
import { createSale } from "@/lib/sales/actions";
import type { CreateSaleFormState } from "@/lib/sales/types";
import { formatUsd, roundMoneyDisplay } from "@/lib/format";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import {
  ProductSalePicker,
  type ProductSaleOption,
} from "@/components/dashboard/sales/ProductSalePicker";
import {
  SalesChannelSelector,
  getSalesChannelDbValue,
} from "@/components/dashboard/sales/SalesChannelSelector";
import {
  getSalesPaymentMethod,
  type SalesPaymentMethodKey,
} from "@/src/config/sales-payment-methods";
import type { SalesChannelKey } from "@/src/config/sales-channels";

interface NewSaleFormProps {
  products: CatalogListItem[];
  exchangeRate: number | null;
}

const initialState: CreateSaleFormState = {};

export function NewSaleForm({ products, exchangeRate }: NewSaleFormProps) {
  const { salesPaymentMethods, config: countryConfig } = useCountry();
  const defaultPaymentKey = salesPaymentMethods[0]?.key ?? "efectivo";
  const [state, formAction, pending] = useActionState(createSale, initialState);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSaleOption | null>(null);
  const [channelKey, setChannelKey] = useState<SalesChannelKey>("tienda_fisica");
  const [paymentKey, setPaymentKey] =
    useState<SalesPaymentMethodKey>(defaultPaymentKey);
  const [quantity, setQuantity] = useState("1");
  const [manualTotal, setManualTotal] = useState(false);
  const [totalInput, setTotalInput] = useState("");

  const quantityNum = Number.parseInt(quantity, 10);
  const unitPrice = selectedProduct?.priceUsd ?? null;

  const autoTotal = useMemo(() => {
    if (unitPrice == null || !Number.isFinite(quantityNum) || quantityNum <= 0) {
      return null;
    }
    return unitPrice * quantityNum;
  }, [unitPrice, quantityNum]);

  const displayTotal = manualTotal
    ? totalInput
    : autoTotal != null
      ? String(autoTotal)
      : "";

  const totalLocal = useMemo(() => {
    const total = Number.parseFloat(displayTotal.replace(",", "."));
    if (
      !countryConfig.currency.showLocalEquivalent ||
      !Number.isFinite(total) ||
      exchangeRate == null
    ) {
      return null;
    }
    return total * exchangeRate;
  }, [displayTotal, exchangeRate, countryConfig.currency.showLocalEquivalent]);

  useEffect(() => {
    if (state.success) {
      setSelectedProduct(null);
      setChannelKey("tienda_fisica");
      setPaymentKey(defaultPaymentKey);
      setQuantity("1");
      setManualTotal(false);
      setTotalInput("");
    }
  }, [state.success, defaultPaymentKey]);

  useEffect(() => {
    if (!manualTotal && autoTotal != null) {
      setTotalInput(String(roundMoneyDisplay(autoTotal)));
    }
  }, [autoTotal, manualTotal]);

  return (
    <form action={formAction} className="card-panel space-y-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Nueva venta
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Registra una venta manual y descuenta stock automáticamente.
          </p>
        </div>
      </div>

      {state.error && (
        <p className="alert-error" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="alert-success" role="status">
          {state.success}
        </p>
      )}

      <ProductSalePicker
        products={products}
        selected={selectedProduct}
        onSelect={setSelectedProduct}
      />

      <input
        type="hidden"
        name="producto_id"
        value={selectedProduct?.productId ?? ""}
      />
      <input
        type="hidden"
        name="variant_id"
        value={selectedProduct?.variantId ?? ""}
      />
      <input
        type="hidden"
        name="canal_venta"
        value={getSalesChannelDbValue(channelKey)}
      />
      <input
        type="hidden"
        name="metodo_pago"
        value={getSalesPaymentMethod(paymentKey).dbValue}
      />

      <SalesChannelSelector value={channelKey} onChange={setChannelKey} />

      <div>
        <label className="label-field" htmlFor="metodo_pago_select">
          Método de pago
        </label>
        <select
          id="metodo_pago_select"
          value={paymentKey}
          onChange={(e) =>
            setPaymentKey(e.target.value as SalesPaymentMethodKey)
          }
          className="input-field"
        >
          {salesPaymentMethods.map((method) => (
            <option key={method.key} value={method.key}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="cantidad">
            Cantidad
          </label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="label-field" htmlFor="monto">
              {countryConfig.currency.salesTotalLabel}
            </label>
            <button
              type="button"
              onClick={() => setManualTotal((prev) => !prev)}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
            >
              {manualTotal ? "Usar cálculo automático" : "Editar total manualmente"}
            </button>
          </div>
          <input
            id="monto"
            name="monto"
            type="number"
            min={0}
            step="0.01"
            value={displayTotal}
            onChange={(e) => {
              setManualTotal(true);
              setTotalInput(e.target.value);
            }}
            readOnly={!manualTotal && autoTotal != null}
            className="input-field"
            required
          />
          {unitPrice != null && (
            <p className="mt-1 text-xs text-zinc-500">
              Precio unitario: {formatUsd(unitPrice)}
              {totalLocal != null &&
                ` · ${formatCountryCurrency(
                  totalLocal,
                  countryConfig.currency.localCurrency,
                  countryConfig.currency.locale,
                )}`}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="label-field" htmlFor="notas">
          Notas (opcional)
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          placeholder="Ej: Cliente recurrente, entrega el viernes…"
          className="input-field min-h-[4.5rem] resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedProduct}
        className="btn-brand w-full shadow-sm disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Registrando…" : "Registrar venta"}
      </button>
    </form>
  );
}
